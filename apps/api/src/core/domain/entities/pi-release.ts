export class PiRelease {
  constructor(
    public readonly id: string,
    public readonly piId: string,
    public name: string,
    public date: Date,
  ) {}
}
