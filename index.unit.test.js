const testHelpers = require('@quoin/node-test-helpers');

const moduleToTest = require('./index');

const expect = testHelpers.expect;

describe("index", () => {
    it("should expose a function with 3 params", () => {
        expect(moduleToTest).to.be.a('function').and.to.have.lengthOf(3);
    });

    it("should expose function initializeIndex() with 1 param", () => {
        expect(moduleToTest).to.have.property('initializeIndex');
        expect(moduleToTest.initializeIndex).to.be.a('function').and.to.have.lengthOf(1);
    });

    it("should expose function indexDocument() with 4 params", () => {
        expect(moduleToTest).to.have.property('indexDocument');
        expect(moduleToTest.indexDocument).to.be.a('function').and.to.have.lengthOf(4);
    });

    it("should expose function indexDomain() with 2 params", () => {
        expect(moduleToTest).to.have.property('indexDomain');
        expect(moduleToTest.indexDomain).to.be.a('function').and.to.have.lengthOf(2);
    });

    describe("index()", () => {
        it("should return a function with 2 params", () => {
            const value = moduleToTest(1, 2, 3);
            expect(value).to.be.a('function').and.to.have.lengthOf(2);
        });
    });
});
