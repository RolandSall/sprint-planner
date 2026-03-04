export class Sprint {
  constructor(
    public readonly id: string,
    public readonly piId: string,
    public name: string,
    public order: number,
    public capacity: number,
    public startDate: Date | null = null,
    public endDate: Date | null = null,
  ) {}
}
