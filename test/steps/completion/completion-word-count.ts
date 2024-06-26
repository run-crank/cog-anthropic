import { Struct } from 'google-protobuf/google/protobuf/struct_pb';
import { expect } from 'chai';
import { default as sinon } from 'ts-sinon';
import 'mocha';
import { Step as ProtoStep, RunStepResponse, StepDefinition, FieldDefinition } from '../../../src/proto/cog_pb';
import { CompletionWordCount as Step } from '../../../src/steps/completion/completion-word-count';

describe('CompletionWordCount', () => {
  let protoStep: ProtoStep;
  let stepUnderTest: Step;
  let clientWrapperStub: any;

  beforeEach(() => {
    protoStep = new ProtoStep();
    clientWrapperStub = sinon.stub();
    clientWrapperStub.getChatCompletion = sinon.stub();
    stepUnderTest = new Step(clientWrapperStub);
  });

  describe('Metadata', () => {
    it('should return expected step metadata', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      expect(stepDef.getStepId()).to.equal('CompletionWordCount');
      expect(stepDef.getName()).to.equal('Check Anthropic prompt response word count from completion');
      expect(stepDef.getExpression()).to.equal(`Anthropic model (?<model>[a-zA-Z0-9_ -.]+) word count in a response to "(?<prompt>[a-zA-Z0-9_ -'".,?!]+)" should (?<operator>be set|not be set|be less than|be greater than|be one of|be|contain|not be one of|not be|not contain|match|not match) ?(?<expectation>.+)?`);
      expect(stepDef.getType()).to.equal(StepDefinition.Type.VALIDATION);
    });

    it('should return expected step fields', () => {
      const stepDef: StepDefinition = stepUnderTest.getDefinition();
      const fields: any[] = stepDef.getExpectedFieldsList().map((field: FieldDefinition) => {
        return field.toObject();
      });

      expect(fields[0].key).to.equal('prompt');
      expect(fields[0].optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(fields[0].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[1].key).to.equal('model');
      expect(fields[1].optionality).to.equal(FieldDefinition.Optionality.REQUIRED);
      expect(fields[1].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[2].key).to.equal('operator');
      expect(fields[2].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[2].type).to.equal(FieldDefinition.Type.STRING);

      expect(fields[3].key).to.equal('expectation');
      expect(fields[3].optionality).to.equal(FieldDefinition.Optionality.OPTIONAL);
      expect(fields[3].type).to.equal(FieldDefinition.Type.NUMERIC);
    });
  });

  describe('ExecuteStep', () => {
    describe('Anthropic prompt response meets word count expectation', () => {
      beforeEach(() => {
        // Setup for the scenario where the Anthropic response meets the expected word count
        const expectedModel: string = 'claude-model';
        const expectedPrompt: string = 'Hello, Anthropic!';
        protoStep.setData(Struct.fromJavaScript({
          model: expectedModel,
          prompt: expectedPrompt,
          expectation: 5, // or some mock number
          operator: 'be',
        }));

        clientWrapperStub.getChatCompletion.returns(Promise.resolve({
          choices: [{ message: { content: 'this is five word response' } }], // Mock response with 5 words
          usage: { completion_tokens: 263, prompt_tokens: 17, total_tokens: 280 },
          created: '1698287166',
        }));
      });

      it('should respond with pass', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.PASSED);
      });
    });

    describe('Anthropic prompt response does not meet word count expectation', () => {
      beforeEach(() => {
        // Setup for the scenario where the Anthropic response does not meet the expected word count
        const expectedModel: string = 'claude-model';
        const expectedPrompt: string = 'Hello, Anthropic!';
        protoStep.setData(Struct.fromJavaScript({
          model: expectedModel,
          prompt: expectedPrompt,
          expectation: 5, // or some mock number
          operator: 'be',
        }));

        clientWrapperStub.getChatCompletion.returns(Promise.resolve({
          choices: [{ message: { content: 'three word response' } }], // Mock response
          usage: { completion_tokens: 263, prompt_tokens: 17, total_tokens: 280 },
          created: '1698287166',
        }));
      });

      it('should respond with fail', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.FAILED);
      });
    });

    describe('Error occurred while fetching Anthropic prompt response', () => {
      beforeEach(() => {
        // setup for the scenario where an error occurs during operation
        clientWrapperStub.getChatCompletion.throws('error');
      });

      it('should respond with error', async () => {
        const response: RunStepResponse = await stepUnderTest.executeStep(protoStep);
        expect(response.getOutcome()).to.equal(RunStepResponse.Outcome.ERROR);
      });
    });
  });
});
