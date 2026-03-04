export class Story {
  constructor(
    public readonly id: string,
    public readonly featureId: string,
    public sprintId: string | null,
    public externalId: string,
    public title: string,
    public estimation: number,
    public externalDependencySprint: number | null,
  ) {}
}
