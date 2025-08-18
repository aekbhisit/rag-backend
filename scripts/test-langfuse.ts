import { Langfuse } from "langfuse";

async function main() {
	const secretKey = process.env.LANGFUSE_SECRET_KEY || "sk-lf-5ba5cf1e-2693-401b-8b08-f57bef8931d0";
	const publicKey = process.env.LANGFUSE_PUBLIC_KEY || "pk-lf-25b3b77a-2a33-4b82-8977-69ead003bf23";
	const baseUrl = process.env.LANGFUSE_HOST || "http://localhost:3101";

	const langfuse = new Langfuse({ secretKey, publicKey, baseUrl });

	const gen = await langfuse.generation({
		name: "sdk-connectivity-test",
		input: { ping: "pong" },
		output: { ok: true },
	});
	await gen.end();
	await langfuse.shutdownAsync();
	console.log("sent generation via SDK");
}

main().catch((e) => {
	console.error("langfuse sdk test failed:", e);
	process.exit(1);
});
