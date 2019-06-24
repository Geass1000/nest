import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { isFunction, isUndefined, isNil, isString } from '@nestjs/common/utils/shared.utils';
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

  /**
   * Extracts patterns from class and method decorators, combines them
   * and returns result.
   *
   * 1. Default Logic
   * Class: -
   * Method: { use: `getData` }
   * Result: { use: `getData` }
   * Route: `{use:getData}`
   *
   * 2. Default Logic
   * Class: -
   * Method: -
   * Result: -
   * Route: -
   *
   * 3. Default Logic
   * Class: -
   * Method: `getData`
   * Result: `getData`
   * Route: `getData`
   *
   * 4.
   * Class: `user`
   * Method: `getData`
   * Result: `user/getData`
   * Route: `user/getData`
   *
   * 5. Class decorators aren't supported
   * Class: { use: `user`, id: 5 }
   * Method: `getData`
   * Result: `getData`
   * Route: `getData`
   *
   * 6.
   * Class: { use: `user` }
   * Method: { use: `getData` }
   * Result: { controller: { use: `user` }, use: `getData` }
   * Route: `{controller:{use:user}/use:getData}`
   *
   * 7.
   * Class: `user`
   * Method: { use: `getData` }
   * Result: { controller: `user`, use: `getData` }
   * Route: `{controller:user/use:getData}`
   *
   * 8.
   * Class: { use: `user` }
   * Method: -
   * Result: { controller: { use: `user` } }
   * Route: `{controller:{use:user}}`
   *
   * 9.
   * Class: `user`
   * Method: -
   * Result: { controller: `user` }
   * Route: `{controller:user}`
   *
   * @param  {Controller} instance - instance of class (controller)
   * @returns MsInterfaces.MethodDescription[]
   */
  public explore(instance: Controller): MsInterfaces.MethodDescription[] {
    const instancePrototype = Object.getPrototypeOf(instance);
    return this.metadataScanner.scanFromPrototype<
        Controller,
        MsInterfaces.MethodDescription
      >(instance, instancePrototype, method => {
        // Gets a method metadata
        const methodMetadata = this.exploreMethodMetadata(instance, instancePrototype, method);

        // If method doesn't have a decorator, callback will return null
        if (isNil(methodMetadata)) {
          return null;
        }

        // Gets a class metadata
        const classMetadata = this.exploreClassMetadata(instancePrototype);

        // Cases 1, 2, 3
        // Returns the default method pattern
        if (isNil(classMetadata.pattern)) {
          return methodMetadata;
        }

        let pattern: any;
        // isObject - Ex: 6, 7; isNil - Ex: 8, 9
        // If method pattern is a string/number (no object/undefined/null) value
        if (!(typeof methodMetadata.pattern === `object`) && !isNil(methodMetadata.pattern)) {
          // Cases 4, 5
          // If class pattern is a string value
          pattern = isString(classMetadata.pattern.controller)
            // Case 4
            // Sets pattern as `controller/method` string pattern
            ? `${classMetadata.pattern.controller}/${methodMetadata.pattern}`
            // Case 5
            // Sets pattern as `method` string pattern
            : methodMetadata.pattern;
        } else {
          // Cases 6, 7, 8, 9
          // If method pattern is not null
          pattern = !isNil(methodMetadata.pattern)
            // Case 6, 7
            // Sets pattern as `class + method` object pattern
            ? { ...classMetadata.pattern, ...methodMetadata.pattern }
            // Case 8, 9
            // Sets pattern as `class` object pattern
            : { ...classMetadata.pattern };
        }

        return {
          ...methodMetadata,
          pattern,
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
