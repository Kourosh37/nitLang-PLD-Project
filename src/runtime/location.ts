/** Store addresses use object identity; equal display IDs do not imply aliasing. */
export class Location {
  constructor(public readonly id: number) {
    Object.freeze(this);
  }
}
