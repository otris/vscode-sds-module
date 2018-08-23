import { expect, should } from "chai";
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import { PDObject } from "../../src/pd-scripting/PDObject";
import { SDSConnection } from "../../src/sds/SDSConnection";
import { ADMIN_USER, ADMIN_USER_PASS, HOST, isLiveMode, PORT, TEST_FELLOW, TEST_FELLOW_PASS, TEST_PRINCIPAL } from "../env.test";
import { MockedJanusServer } from "../MockedJanusServer";

/* tslint:disable:no-unused-expression */
chai.use(chaiAsPromised);

describe("Tests for the PDClass-library of the JANUS-application", async () => {
	// For the unit tests we need to mock a JANUS-server that sends back meaningful and
	// correct responses to incoming requests
	const mockedJANUSServer = new MockedJanusServer();
	const sdsConnection = new SDSConnection();

	before(async () => {
		// Init the mocked JANUS-server and connect with it to test operations of the PDClass
		await mockedJANUSServer.init();
		await sdsConnection.connect("test.node-sds.pdclass", HOST, PORT);
		await sdsConnection.PDClass.changeUser(ADMIN_USER, ADMIN_USER_PASS);
		await sdsConnection.PDClass.changePrincipal(TEST_PRINCIPAL);
	});

	it("should successfully change the logged in user", () => {
		return expect(sdsConnection.PDClass.changeUser(ADMIN_USER, ADMIN_USER_PASS)).to.not.be.eventually.rejected;
	});

	it("should return the id of the logged in user", async () => {
		const userId = await sdsConnection.PDClass.changeUser(ADMIN_USER, ADMIN_USER_PASS);
		expect(userId).to.be.a("number");
	});

	it("should successfully change the user to a principals fellow", () => {
		return expect(sdsConnection.PDClass.changeUser(TEST_FELLOW, TEST_FELLOW_PASS, TEST_PRINCIPAL)).to.not.be.eventually.rejected;
	});

	it("should fail to change the user to a fellow if the principal is not passed", () => {
		return expect(sdsConnection.PDClass.changeUser(TEST_FELLOW, TEST_FELLOW_PASS))
			.to.be.eventually.rejectedWith(Error)
			.and.have.property("message")
			.which.matches(/Change user request failed\. Maybe you forgot to provide the principal\?/)
			.and.matches(/Error code: 16/);
	});

	it("should not reject the change user request if the user is the admin user and a principal is passed", () => {
		// this has to be tested because if the principal name would be appended to the admin user login, the login would fail
		return expect(sdsConnection.PDClass.changeUser(ADMIN_USER, ADMIN_USER_PASS, TEST_PRINCIPAL)).to.not.be.eventually.rejected;
	});

	it("should automatically change the principal if a changeUser-request is executed to a fellow", async () => {
		await sdsConnection.PDClass.changeUser(TEST_FELLOW, TEST_FELLOW_PASS, TEST_PRINCIPAL);

		// @todo: For now it's not possible to request the current principal. But the server sends no response if two changeUser-requests
		//        are received without a changePrincipal-request between them, which causes the second request to be rejected with an timeout
		//        But this should be definitely be changed in the future
		return expect(sdsConnection.PDClass.changeUser(TEST_FELLOW, TEST_FELLOW_PASS, TEST_PRINCIPAL)).to.not.be.eventually.rejected;
	});

	(isLiveMode()) ? it.skip : it("should successfully change the logged in user when no password is set", () => {
		// This test will fail on the live system if the password of the admin user is not empty
		return expect(sdsConnection.PDClass.changeUser(ADMIN_USER, "")).to.not.be.eventually.rejected;
	});

	it("should reject the changeUser-request because the user doesn't exists", () => {
		return expect(sdsConnection.PDClass.changeUser(ADMIN_USER.split("").reverse().join(""), ADMIN_USER_PASS))
			.to.be.eventually.rejectedWith(Error)
			.and.have.property("message")
			.which.matches(/Change user request failed/)
			.and.matches(/Error code: 16/);
	});

	it("should reject the changeUser-request because the password is wrong", () => {
		return expect(sdsConnection.PDClass.changeUser(ADMIN_USER, `${ADMIN_USER_PASS}random`))
			.to.be.eventually.rejectedWith(Error)
			.and.have.property("message")
			.which.matches(/Change user request failed/)
			.and.matches(/Error code: 21/);
	});

	it("should change the principal successfully", () => {
		return expect(sdsConnection.PDClass.changePrincipal(TEST_PRINCIPAL)).to.not.be.eventually.rejected;
	});

	it("should fail to change the principal if the principal doesn't exists", () => {
		const principal = "notExisting";
		return expect(sdsConnection.PDClass.changePrincipal(principal))
			.to.be.eventually.rejectedWith(Error)
			.and.have.property("message")
			.which.matches(new RegExp(`Unable to change principal to '${principal}'`))
			.and.matches(new RegExp("Error code: 18"));
	});

	it("should create a PDObject", async () => {
		const pdObject = await sdsConnection.PDClass.newObject("PortalScript");
		expect(pdObject.className).to.equal("PortalScript");

		const expectedClassId = await sdsConnection.PDMeta.getClassId("PortalScript");
		expect(pdObject.classId).to.equal(expectedClassId);
		expect(pdObject.isTransactional).to.be.false;
	});

	it("should create a transaction object", async () => {
		const pdObject = await sdsConnection.PDClass.newObject("AccessProfile", true);
		expect(pdObject.isTransactional).to.be.true;
	});

	it("should return an object by it's id", async () => {
		// first we have to create the object
		let pdObject = await sdsConnection.PDClass.newObject("PortalScript");
		pdObject = await sdsConnection.PDClass.ptr(pdObject.oId);
		expect(pdObject).to.be.instanceof(PDObject);
	});

	it("should reject if trying to fetch an object by it's id which does not exist", () => {
		return expect(sdsConnection.PDClass.ptr("456:123"))
			.to.be.eventually.rejectedWith(Error, `The object with id '456:123' does not exists`);
	});

	(!isLiveMode()) ? it.skip : it.only("callOperationAsync no params", async () => {
		const ret = await sdsConnection.PDClass.callOperationAsync("PortalScript.noOperation");
		expect(ret).to.eq(undefined);
	});
	(!isLiveMode()) ? it.skip : it("callOperation sync no params", async () => {
		const ret = await sdsConnection.PDClass.callOperation("PortalScript.noOperation");
		expect(ret).to.eq(0);
	});
	(!isLiveMode()) ? it.skip : it("callOperationAsync with params", async () => {
		const ret = await sdsConnection.PDClass.callOperationAsync("PortalScript.runScript", ["noScript"]);
		expect(ret).to.eq(undefined);
	});
	(!isLiveMode()) ? it.skip : it("callOperation sync with params", async () => {
		const ret = await sdsConnection.PDClass.callOperation("PortalScript.runScript", ["noScript"]);
		expect(ret).to.eq(-1);
	});

	after(() => {
		sdsConnection.disconnect();
		mockedJANUSServer.close();
	});
});
