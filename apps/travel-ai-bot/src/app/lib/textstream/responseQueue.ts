export class TextResponseMerger {
  private content: string = '';

  append(delta: string) {
    if (!delta) return this.content;
    const incoming = String(delta);
    if (incoming.startsWith(this.content) || this.content.length === 0) {
      this.content = incoming;
    } else {
      this.content = this.content + incoming;
    }
    return this.content;
  }

  get(): string {
    return this.content;
  }

  reset() {
    this.content = '';
  }
}
