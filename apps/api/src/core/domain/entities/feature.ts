export class Feature {
  constructor(
    public readonly id: string,
    public readonly piId: string,
    public externalId: string,
    public title: string,
    public color: string | null,
    public releaseId: string | null = null,
  ) {}
}
