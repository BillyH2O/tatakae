import { randomUUID } from 'expo-crypto';

export type IdGenerator = () => string;

/** Stable UUID v4 generated on the device. */
export const newId: IdGenerator = () => randomUUID();
