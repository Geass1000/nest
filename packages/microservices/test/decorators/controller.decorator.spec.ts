import { PATTERN_METADATA } from './../../constants';
import 'mocha';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { Controller } from '../../decorators/controller.decorator';

describe('@Controller', () => {
  beforeEach(() => {
    sinon.restore();
  });

  class Test {}

  it(`should set pattern to the reflect-metadata`, () => {
    const reflectDefineMetadataStub = sinon.stub(Reflect, 'defineMetadata');
    const pattern = { use: `app` };

    Controller(pattern)(Test);

    expect(reflectDefineMetadataStub.args[0][0]).to.be.equal(PATTERN_METADATA);
    expect(reflectDefineMetadataStub.args[0][1]).to.be.equal(pattern);
    expect(reflectDefineMetadataStub.args[0][2]).to.be.equal(Test);

    reflectDefineMetadataStub.restore();
  });
});
