import {
  Controller as CommonController,
  ControllerOptions as CommonControllerOptions
} from '@nestjs/common';
import { PATTERN_METADATA } from './../constants';
import { PatternMetadata } from '../interfaces/pattern-metadata.interface';

export const Controller = (
    pattern: PatternMetadata | string,
    prefixOrOptions?: CommonControllerOptions|string): ClassDecorator => {
  return (target) => {
    Reflect.defineMetadata(PATTERN_METADATA, pattern, target);
    return CommonController(prefixOrOptions as any)(target);
  };
};
