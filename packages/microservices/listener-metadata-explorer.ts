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

  public exploreClassMetadata(instancePrototype: any): MsInterfaces.ClassDescription {
    const defPattern = ``;
    const refPattern = Reflect.getMetadata(PATTERN_METADATA, instancePrototype.constructor);
    const pattern = isUndefined(refPattern) ? defPattern : refPattern;
    return {
        pattern: { controller: pattern },
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
