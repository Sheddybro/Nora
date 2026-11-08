export class RequestSequence {
  private current = 0;

  begin() {
    this.current += 1;
    return this.current;
  }

  isCurrent(request: number) {
    return request === this.current;
  }

  invalidate() {
    this.current += 1;
  }
}
