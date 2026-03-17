export interface ICustomScriptCode {
  get sqlCode(): string;
  get codeDescription(): string;
}
export interface ICustomGeneratorID {
  generateId(): Promise<string | undefined>;
}
