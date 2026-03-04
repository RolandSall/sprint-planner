export class StoryDependency {
  constructor(
    public readonly storyId: string,
    public readonly dependsOnStoryId: string,
  ) {}
}
