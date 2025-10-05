import { useRef } from "react";
import { convertWebMBlobToWav } from "../lib/audioUtils";

function useAudioDownload() {
  // Ref to store the MediaRecorder instance.
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  // Ref to collect all recorded Blob chunks.
  const recordedChunksRef = useRef<Blob[]>([]);
  // Ref to store the selected mime type.
  const selectedMimeTypeRef = useRef<string>("audio/webm");
  // Track resources to clean up
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  /**
   * Starts recording by combining the provided remote stream with
   * the microphone audio.
   * @param remoteStream - The remote MediaStream (e.g., from the audio element).
   */
  const startRecording = async (remoteStream: MediaStream) => {
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Error getting microphone stream:", err);
      // Fallback to an empty MediaStream if microphone access fails.
      micStream = new MediaStream();
    }

    // Keep reference for cleanup
    micStreamRef.current = micStream;

    // Create an AudioContext to merge the streams.
    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const destination = audioContext.createMediaStreamDestination();

    // Connect the remote audio stream.
    try {
      const remoteSource = audioContext.createMediaStreamSource(remoteStream);
      remoteSource.connect(destination);
    } catch (err) {
      console.error("Error connecting remote stream to the audio context:", err);
    }

    // Connect the microphone audio stream.
    try {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);
    } catch (err) {
      console.error("Error connecting microphone stream to the audio context:", err);
    }

    // Check for supported mimeTypes
    let options = {};
    const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', ''];
    
    for (const type of mimeTypes) {
      if (!type || MediaRecorder.isTypeSupported(type)) {
        options = type ? { mimeType: type } : {};
        selectedMimeTypeRef.current = type || '';
        break;
      }
    }

    try {
      // Clear any previous recording buffers before starting
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(destination.stream, options);
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      // Start recording without a timeslice.
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.error("Error starting MediaRecorder with combined stream:", err);
    }
  };

  /**
   * Stops the MediaRecorder, if active.
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      // Request any final data before stopping.
      mediaRecorderRef.current.requestData();
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop microphone tracks
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      micStreamRef.current = null;
    }

    // Close audio context to release buffers
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
  };

  /**
   * Initiates download of the recording after converting from WebM to WAV.
   * If the recorder is still active, we request its latest data before downloading.
   */
  const downloadRecording = async () => {
    // If recording is still active, request the latest chunk.
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Request the current data.
      mediaRecorderRef.current.requestData();
      // Allow a short delay for ondataavailable to fire.
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (recordedChunksRef.current.length === 0) {
      console.warn("No recorded chunks found to download.");
      return;
    }
    
    // Combine the recorded chunks into a single blob with the appropriate type
    const recordedBlob = new Blob(recordedChunksRef.current, { 
      type: selectedMimeTypeRef.current || 'audio/webm' 
    });

    try {
      // Convert the blob into a WAV blob.
      const wavBlob = await convertWebMBlobToWav(recordedBlob);
      const url = URL.createObjectURL(wavBlob);

      // Generate a formatted datetime string (replace characters not allowed in filenames).
      const now = new Date().toISOString().replace(/[:.]/g, "-");

      // Create an invisible anchor element and trigger the download.
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `realtime_agents_audio_${now}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Clean up the blob URL after a short delay.
      setTimeout(() => URL.revokeObjectURL(url), 100);

      // Clear recorded chunks to free memory after download
      recordedChunksRef.current = [];
    } catch (err) {
      console.error("Error converting recording to WAV:", err);
    }
  };

  return { startRecording, stopRecording, downloadRecording };
}

export default useAudioDownload; 