import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { isFunction, isUndefined, isNil } from '@nestjs/common/utils/shared.utils';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import {
  CLIENT_CONFIGURATION_METADATA,
  CLIENT_METADATA,
  PATTERN_HANDLER_METADATA,
  PATTERN_METADATA,
} from './constants';
import { PatternHandler } from './enums/pattern-handler.enum';
import * as MsInterfaces from './interfaces';

export class ListenerMetadataExplorer {
  constructor(private readonly metadataScanner: MetadataScanner) {}

  public explore(instance: Controller): MsInterfaces.MethodDescription[] {
    const instancePrototype = Object.getPrototypeOf(instance);
    return this.metadataScanner.scanFromPrototype<
        Controller,
        MsInterfaces.MethodDescription
      >(instance, instancePrototype, method => {
        const methodMetadata = this.exploreMethodMetadata(instance, instancePrototype, method);

        if (isNil(methodMetadata)) {
          return null;
        }

        const classMetadata = this.exploreClassMetadata(instancePrototype);

        return {
          ...methodMetadata,
          pattern: { ...classMetadata.pattern, ...methodMetadata.pattern },
        };
      });
  }

  public exploreMethodMetadata(
    instance: object,
    instancePrototype: any,
    methodKey: string,
  ): MsInterfaces.MethodDescription {
    const targetCallback = instancePrototype[methodKey];

    const handlerType = Reflect.getMetadata(PATTERN_HANDLER_METADATA, targetCallback);

    if (isUndefined(handlerType)) {
      return null;
    }

    const pattern = Reflect.getMetadata(PATTERN_METADATA, targetCallback);

    return {
      methodKey,
      targetCallback,
      pattern,
      isEventHandler: handlerType === PatternHandler.EVENT,
    };
  }

  /**
   * Extracts pattern from a class decorator.
   *
   * @param  {any} instancePrototype - prototype of class
   * @returns MsInterfaces.ClassDescription
   */
  public exploreClassMetadata(instancePrototype: any): MsInterfaces.ClassDescription {
    // Gets class pattern from Reflect-Metadata
    const refPattern = Reflect.getMetadata(PATTERN_METADATA, instancePrototype.constructor);

    // If class doesn't have a decorator, fn will set pattern to `null` value
    // otherwise fn will set pattern to { controller: <pattern from decorator> }
    const pattern = isNil(refPattern) ? null : { controller: refPattern };

    return {
        pattern,
    };
  }

  public *scanForClientHooks(
    instance: Controller,
  ): IterableIterator<MsInterfaces.ClientProperties> {
    for (const propertyKey in instance) {
      if (isFunction(propertyKey)) {
        continue;
      }
      const property = String(propertyKey);
      const isClient = Reflect.getMetadata(CLIENT_METADATA, instance, property);
      if (isUndefined(isClient)) {
        continue;
      }
      const metadata = Reflect.getMetadata(
        CLIENT_CONFIGURATION_METADATA,
        instance,
        property,
      );
      yield { property, metadata };
    }
  }
}
