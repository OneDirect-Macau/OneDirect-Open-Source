export class EtaParseError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "EtaParseError";
    this.issues = issues;
  }
}
