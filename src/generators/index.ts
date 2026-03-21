import type { Grid } from '../grid';
import type { GeneratorStep } from './types';
import { recursiveBacktracker } from './recursiveBacktracker';
import { prims } from './prims';
import { kruskals } from './kruskals';

export type GeneratorName = 'recursive-backtracker' | 'prims' | 'kruskals';

export type MazeGenerator = (grid: Grid) => Generator<GeneratorStep>;

const registry: Record<GeneratorName, MazeGenerator> = {
    'recursive-backtracker': recursiveBacktracker,
    prims,
    kruskals,
};

export function getGenerator(name: GeneratorName): MazeGenerator {
    return registry[name];
}

export const generatorNames: GeneratorName[] = Object.keys(registry) as GeneratorName[];

export { recursiveBacktracker, prims, kruskals };
export type { GeneratorStep };
