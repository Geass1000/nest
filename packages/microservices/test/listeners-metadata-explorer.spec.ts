import { expect } from 'chai';
import * as sinon from 'sinon';
import { MetadataScanner } from '../../core/metadata-scanner';
import { Client } from '../decorators/client.decorator';
import { MessagePattern } from '../decorators/message-pattern.decorator';
import { Transport } from '../enums/transport.enum';
import { ListenerMetadataExplorer } from '../listener-metadata-explorer';
import {
  PATTERN_METADATA,
} from '../constants';

describe('ListenerMetadataExplorer', () => {
  const pattern = { pattern: 'test' };
  const secPattern = { role: '2', cmd: 'm' };
  const clientMetadata = {};
  const clientSecMetadata = { transport: Transport.REDIS };

  class Test {
    @Client(clientMetadata as any)
    public client;
    @Client(clientSecMetadata as any)
    public redisClient;

    get testGet() {
      return 0;
    }
    set testSet(val) {}

    constructor() {}

    @MessagePattern(pattern)
    public test() {}

    @MessagePattern(secPattern)
    public testSec() {}

    public noPattern() {}
  }
  let scanner: MetadataScanner;
  let instance: ListenerMetadataExplorer;

  beforeEach(() => {
    scanner = new MetadataScanner();
    instance = new ListenerMetadataExplorer(scanner);
  });
  describe('explore', () => {
    let test: Test;
    const sandbox = sinon.createSandbox();
    const methodKey = 'anyKey';
    const classPrototype = Test.prototype;

    let lmeExploreMethodMetadataStub: sinon.SinonStub;
    let lmeExploreClassMetadataStub: sinon.SinonStub;

    beforeEach(() => {
      test = new Test();
      sandbox
        .stub((instance as any), 'metadataScanner')
        .value({ scanFromPrototype(arg1, arg2, arg3) { return arg3(methodKey); } });
      lmeExploreMethodMetadataStub = sinon
        .stub(instance, 'exploreMethodMetadata');
      lmeExploreClassMetadataStub = sinon
        .stub(instance, 'exploreClassMetadata');
    });

    afterEach(() => {
      lmeExploreMethodMetadataStub.restore();
      lmeExploreClassMetadataStub.restore();
      sandbox.restore();
    });

    it(`should call 'scanFromPrototype with expected arguments`, () => {
      sandbox
        .stub((instance as any), 'metadataScanner')
        .value({ scanFromPrototype(arg1, arg2, arg3) {} });
      const lmeScanFromPrototypeSpy = sinon
        .spy((instance as any).metadataScanner, 'scanFromPrototype');

      instance.explore(test);
      expect(lmeScanFromPrototypeSpy.args[0][0]).to.be.equal(test);
      expect(lmeScanFromPrototypeSpy.args[0][1]).to.be.equal(classPrototype);

      lmeScanFromPrototypeSpy.restore();
    });

    it(`should call 'exploreMethodMetadata with expected arguments`, () => {
      instance.explore(test);
      expect(lmeExploreMethodMetadataStub.args[0][0]).to.be.equal(test);
      expect(lmeExploreMethodMetadataStub.args[0][1]).to.be.equal(classPrototype);
      expect(lmeExploreMethodMetadataStub.args[0][2]).to.be.equal(methodKey);
    });

    describe(`when 'exploreMethodMetadata' returns 'null'`, () => {
      it(`should return 'null'`, () => {
        lmeExploreMethodMetadataStub
          .returns(null);

        const result = instance.explore(test);
        expect(result).to.be.null;
      });
    });

    it(`should call 'exploreClassMetadata with expected arguments`, () => {
      const exploreMethodMetadata: any = { use: `getData` };
      lmeExploreMethodMetadataStub
        .returns(exploreMethodMetadata);

      try {
        instance.explore(test);
      } catch (error) {}
      expect(lmeExploreClassMetadataStub.args[0][0]).to.be.equal(classPrototype);
    });

    describe(`when 'exploreClassMetadata' returns 'null' pattern (case 1,2,3)`, () => {
      it(`should return correct metadata`, () => {
        const exploreMethodMetadata: any = { use: `getData` };
        lmeExploreMethodMetadataStub
          .returns(exploreMethodMetadata);
        lmeExploreClassMetadataStub
          .returns({ pattern: null });

        const result = instance.explore(test);
        expect(result).to.be.equal(exploreMethodMetadata);
      });
    });

    describe(`when happens 4th case`, () => {
      it(`should return correct metadata`, () => {
        const classPattern: any = { controller: `user` };
        const methodPattern: any = `getData`;
        const resultPattern = `user/getData`;
        lmeExploreMethodMetadataStub
          .returns({ pattern: methodPattern });
        lmeExploreClassMetadataStub
          .returns({ pattern: classPattern });

        const result = instance.explore(test);
        expect(result).to.be.deep.equal({ pattern: resultPattern });
      });
    });

    describe(`when happens 5th case`, () => {
      it(`should return correct metadata`, () => {
        const classPattern: any = { controller: { use: `user`, id: 5 } };
        const methodPattern: any = `getData`;
        const resultPattern = `getData`;
        lmeExploreMethodMetadataStub
          .returns({ pattern: methodPattern });
        lmeExploreClassMetadataStub
          .returns({ pattern: classPattern });

        const result = instance.explore(test);
        expect(result).to.be.deep.equal({ pattern: resultPattern });
      });
    });

    describe(`when happens 6th case`, () => {
      it(`should return correct metadata`, () => {
        const classPattern: any = { controller: { use: `user` } };
        const methodPattern: any = { use: `getData` };
        const resultPattern = { controller: { use: `user` }, use: `getData` };
        lmeExploreMethodMetadataStub
          .returns({ pattern: methodPattern });
        lmeExploreClassMetadataStub
          .returns({ pattern: classPattern });

        const result = instance.explore(test);
        expect(result).to.be.deep.equal({ pattern: resultPattern });
      });
    });

    describe(`when happens 7th case`, () => {
      it(`should return correct metadata`, () => {
        const classPattern: any = { controller: `user` };
        const methodPattern: any = { use: `getData` };
        const resultPattern = { controller: `user`, use: `getData` };
        lmeExploreMethodMetadataStub
          .returns({ pattern: methodPattern });
        lmeExploreClassMetadataStub
          .returns({ pattern: classPattern });

        const result = instance.explore(test);
        expect(result).to.be.deep.equal({ pattern: resultPattern });
      });
    });

    describe(`when happens 8th case`, () => {
      it(`should return correct metadata`, () => {
        const classPattern: any = { controller: { use: `user` } };
        const methodPattern: any = null;
        const resultPattern = { controller: { use: `user` } };
        lmeExploreMethodMetadataStub
          .returns({ pattern: methodPattern });
        lmeExploreClassMetadataStub
          .returns({ pattern: classPattern });

        const result = instance.explore(test);
        expect(result).to.be.deep.equal({ pattern: resultPattern });
      });
    });

    describe(`when happens 9th case`, () => {
      it(`should return correct metadata`, () => {
        const classPattern: any = { controller: `user` };
        const methodPattern: any = null;
        const resultPattern = { controller: `user` };
        lmeExploreMethodMetadataStub
          .returns({ pattern: methodPattern });
        lmeExploreClassMetadataStub
          .returns({ pattern: classPattern });

        const result = instance.explore(test);
        expect(result).to.be.deep.equal({ pattern: resultPattern });
      });
    });

  });

  describe('exploreMethodMetadata', () => {
    let test: Test;
    beforeEach(() => {
      test = new Test();
    });

    describe(`when "handlerType" metadata is undefined`, () => {
      it(`should return null`, () => {
        const metadata = instance.exploreMethodMetadata(
          test,
          Object.getPrototypeOf(test),
          'noPattern',
        );
        expect(metadata).to.be.null;
      });
    });

    describe(`when "handlerType" metadata is not undefined`, () => {
      it(`should return pattern properties`, () => {
        const metadata = instance.exploreMethodMetadata(
          test,
          Object.getPrototypeOf(test),
          'test',
        );
        expect(metadata).to.have.keys([
          'isEventHandler',
          'methodKey',
          'targetCallback',
          'pattern',
        ]);
        expect(metadata.pattern).to.eql(pattern);
      });
    });
  });

  describe('exploreClassMetadata', () => {
    const test: Test = new Test();
    const classPrototype = Object.getPrototypeOf(test);

    describe(`when class metadata is undefined or null`, () => {
      it(`should return object where pattern field is a 'null'`, () => {
        const classPattern = null;

        Reflect.defineMetadata(PATTERN_METADATA, undefined, classPrototype.constructor);

        const metadata = instance.exploreClassMetadata(classPrototype);
        expect(metadata).to.be.deep.equal({ pattern: classPattern });
      });
    });

    describe(`when class metadata is defined`, () => {
      it(`should return object where pattern field is a defined data`, () => {
        const classPatterns = [
          `cat`, 4,
          { path: 'user' },
          Symbol('User'),
        ];

        classPatterns.forEach((classPattern) => {
          Reflect.defineMetadata(PATTERN_METADATA, classPattern, classPrototype.constructor);

          const metadata = instance.exploreClassMetadata(classPrototype);
          expect(metadata).to.be.deep.equal({ pattern: { controller: classPattern } });
        });
      });
    });
  });

  describe('scanForClientHooks', () => {
    it(`should returns properties with @Client decorator`, () => {
      const obj = new Test();
      const hooks = [...instance.scanForClientHooks(obj)];

      expect(hooks).to.have.length(2);
      expect(hooks[0]).to.deep.eq({
        property: 'client',
        metadata: clientMetadata,
      });
      expect(hooks[1]).to.deep.eq({
        property: 'redisClient',
        metadata: clientSecMetadata,
      });
    });
  });
});
