import { ClientOptions } from './client-metadata.interface';
import { PatternMetadata } from './pattern-metadata.interface';

export interface ClientProperties {
  property: string;
  metadata: ClientOptions;
}

export interface PatternDescription {
  pattern: PatternMetadata;
}

export interface ClassDescription extends PatternDescription {
}

export interface MethodDescription extends PatternDescription {
  methodKey: string;
  isEventHandler: boolean;
  targetCallback: (...args: any[]) => any;
}
