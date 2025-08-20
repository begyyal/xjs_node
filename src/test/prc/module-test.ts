import { TestUnit } from "./test-unut";

export class ModuleTest {
    private readonly _units: TestUnit[] = [];
    constructor(readonly name: string) { }
    appendUnit(
        unitName: string,
        cb: (this: TestUnit) => void | Promise<void>,
        op?: { concurrent?: boolean }): TestUnit {
        if (this._units.some(u => u.name === unitName))
            throw Error("duplication of unit name was detected.");
        const u = new TestUnit(this.name, unitName, cb, op);
        this._units.push(u);
        return u;
    }
    async exe(): Promise<void> {
        for (const u of this._units.filter(u => !u.op?.concurrent)) await u.exe();
        await Promise.all(this._units.filter(u => !!u.op?.concurrent).map(u => u.exe()));
        console.log([
            `tests in ${this.name} module completed.`.padEnd(40),
            `${this._units.length} units`.padEnd(9),
            `${this._units.map(u => u.caseCount).reduce((a, b) => a + b)} cases`.padEnd(10)
        ].join(" | "));
    }
}