import type { Grid } from '../grid';
import type { GeneratorStep } from './types';
import { recursiveBacktracker } from './recursiveBacktracker';
import { prims } from './prims';
import { kruskals } from './kruskals';
import { wilsons } from './wilsons';
import { aldousBroder } from './aldousBroder';
import { ellers } from './ellers';

export type GeneratorName =
    | 'recursive-backtracker'
    | 'prims'
    | 'kruskals'
    | 'wilsons'
    | 'aldous-broder'
    | 'ellers';

export type MazeGenerator = (grid: Grid) => Generator<GeneratorStep>;

const registry: Record<GeneratorName, MazeGenerator> = {
    'recursive-backtracker': recursiveBacktracker,
    prims,
    kruskals,
    wilsons,
    'aldous-broder': aldousBroder,
    ellers,
};

export function getGenerator(name: GeneratorName): MazeGenerator {
    return registry[name];
}

export const generatorNames: GeneratorName[] = Object.keys(registry) as GeneratorName[];

export { recursiveBacktracker, prims, kruskals, wilsons, aldousBroder, ellers };
export type { GeneratorStep };
