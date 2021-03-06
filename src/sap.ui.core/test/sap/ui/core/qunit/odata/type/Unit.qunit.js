/*!
 * ${copyright}
 */
sap.ui.define([
	"sap/base/Log",
	"sap/ui/core/format/NumberFormat",
	"sap/ui/model/odata/type/Unit",
	"sap/ui/model/type/Unit"
], function (Log, NumberFormat, Unit, BaseUnit) {
	/*global QUnit, sinon */
	"use strict";

	var sDefaultLanguage = sap.ui.getCore().getConfiguration().getLanguage();

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.type.Unit", {
		beforeEach : function () {
			this.oLogMock = this.mock(Log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();
			sap.ui.getCore().getConfiguration().setLanguage("en-US");
		},
		afterEach : function () {
			sap.ui.getCore().getConfiguration().setLanguage(sDefaultLanguage);
		}
	});

	//*********************************************************************************************
	QUnit.test("constructor", function (assert) {
		var oFormatOptions = {groupingEnabled : false},
			oType;

		// code under test
		oType = new Unit(oFormatOptions);

		assert.ok(oType instanceof Unit, "is a Unit");
		assert.ok(oType instanceof BaseUnit, "is a sap.ui.model.type.Unit");
		assert.strictEqual(oType.getName(), "sap.ui.model.odata.type.Unit", "type name");
		assert.deepEqual(oType.oConstraints, {});
		assert.notStrictEqual(oType.oFormatOptions, oFormatOptions);
		assert.deepEqual(oType.oFormatOptions, {groupingEnabled : false, parseAsString : true});
		assert.deepEqual(oType.aDynamicFormatOptionNames, ["customUnits"]);
		assert.strictEqual(oType.getInterface(), oType, "returns no interface facade");
		assert.ok(oType.hasOwnProperty("mCustomUnits"));
		assert.strictEqual(oType.mCustomUnits, undefined);

		oFormatOptions.parseAsString = false;

		// code under test
		oType = new Unit(oFormatOptions);

		assert.strictEqual(oType.oFormatOptions.parseAsString, false);
		assert.deepEqual(oType.oFormatOptions, oFormatOptions);
		assert.notStrictEqual(oType.oFormatOptions, oFormatOptions,
			"format options are immutable: clone");

		oFormatOptions.parseAsString = undefined;

		// code under test
		oType = new Unit(oFormatOptions);

		assert.strictEqual(oType.oFormatOptions.parseAsString, undefined);
		assert.deepEqual(oType.oFormatOptions, oFormatOptions);
		assert.notStrictEqual(oType.oFormatOptions, oFormatOptions);

		assert.throws(function () {
			oType = new Unit({}, {"minimum" : 42});
		}, new Error("Constraints not supported"));

		assert.throws(function () {
			oType = new Unit({}, undefined, []);
		}, new Error("Only the parameter oFormatOptions is supported"));

		assert.throws(function () {
			oType = new Unit({customUnits : {}});
		}, new Error("Format option customUnits is not supported"));
	});

	//*********************************************************************************************
	[
		// see CompositeType#formatValue: "If aValues is not defined or null, null will be returned"
		undefined,
		null,
		// CompositeBinding#getExternalValue always calls #formatValue of its type with the current
		// value of the property bindings which are its parts => array has always length 3
		[undefined, undefined, undefined],
		[42, undefined, undefined],
		[42, "KG", undefined],
		[42, undefined, {}],
		[undefined, "KG", {}],
		[42, null, {}],
		[null, "KG", {}],
		[undefined, undefined, {}],
		[null, undefined, {}],
		[undefined, null, {}],
		[null, null, {}]
	].forEach(function (aValues, i) {
		QUnit.test("formatValue returns null, " + i, function (assert) {
			var oType = new Unit();

			this.mock(BaseUnit.prototype).expects("formatValue").never();

			assert.strictEqual(oType.formatValue(aValues, "foo"), null);
		});
	});

	//*********************************************************************************************
	QUnit.test("formatValue w/o customizing", function (assert) {
		var oBaseUnitMock = this.mock(BaseUnit.prototype),
			oExpectation,
			oType = new Unit(),
			aValues = [42, "KG", null];

		oExpectation = oBaseUnitMock.expects("formatValue").on(oType)
			.withExactArgs([42, "KG"], "foo")
			.returns("42 KG");

		// code under test
		assert.strictEqual(oType.formatValue(aValues, "foo"), "42 KG");

		assert.strictEqual(oType.mCustomUnits, null);
		assert.notStrictEqual(oExpectation.firstCall.args[0], aValues);

		aValues = [77, "KG", {/*customizing, not null*/}];
		oExpectation = oBaseUnitMock.expects("formatValue").on(oType)
			.withExactArgs([77, "KG"], "foo")
			.returns("77 KG");

		// code under test: change to aValues[2] does not change existing customizing null
		assert.strictEqual(oType.formatValue(aValues, "foo"), "77 KG");

		assert.strictEqual(oType.mCustomUnits, null, "remains null");
		assert.notStrictEqual(oExpectation.firstCall.args[0], aValues);

		aValues = [78, "KG", undefined];
		oExpectation = oBaseUnitMock.expects("formatValue").on(oType)
			.withExactArgs([78, "KG"], "foo")
			.returns("78 KG");

		// code under test: change to aValues[2] does not change existing customizing null
		assert.strictEqual(oType.formatValue(aValues, "foo"), "78 KG");

		assert.strictEqual(oType.mCustomUnits, null, "remains null");
		assert.notStrictEqual(oExpectation.firstCall.args[0], aValues);
	});

	//*********************************************************************************************
	QUnit.test("formatValue with customizing", function (assert) {
		var oBaseUnitMock = this.mock(BaseUnit.prototype),
			mCustomizing = {
				"G" : {Text : "gram", UnitSpecificScale : 3},
				"KG" : {Text : "kilogram", UnitSpecificScale : 2}
			},
			mCustomizing2,
			mCustomUnits = {
				"G" : {displayName : "gram", decimals : 3, "unitPattern-count-other" : "{0} G"},
				"KG" : {displayName : "kilogram", decimals : 2,
					"unitPattern-count-other" : "{0} KG"}
			},
			oExpectation,
			oNumberFormatMock = this.mock(NumberFormat),
			oType = new Unit(),
			oType2 = new Unit(),
			oTypeCustomUnits,
			aValues = ["42", "KG", mCustomizing];

		oNumberFormatMock.expects("getDefaultUnitPattern").withExactArgs("G")
			.returns(mCustomUnits["G"]["unitPattern-count-other"]);
		oNumberFormatMock.expects("getDefaultUnitPattern").withExactArgs("KG")
			.returns(mCustomUnits["KG"]["unitPattern-count-other"]);
		oExpectation = oBaseUnitMock.expects("formatValue").on(oType)
			.withExactArgs(["42", "KG", mCustomUnits], "foo")
			.returns("42 KG");

		// code under test
		assert.strictEqual(oType.formatValue(aValues, "foo"), "42 KG");

		assert.deepEqual(aValues, ["42", "KG", mCustomizing], "aValues unmodified");
		assert.deepEqual(oType.mCustomUnits, mCustomUnits);

		oTypeCustomUnits = oType.mCustomUnits;
		oBaseUnitMock.expects("formatValue").on(oType)
			.withExactArgs(["77", "G", sinon.match.same(oExpectation.firstCall.args[0][2])], "foo")
			.returns("77 G");

		// code under test: 2nd call to formatValue reuses mCustomUnits from 1st call
		assert.strictEqual(oType.formatValue(["77", "G", mCustomizing], "foo"), "77 G");

		assert.deepEqual(oType.mCustomUnits, mCustomUnits);
		assert.strictEqual(oType.mCustomUnits, oTypeCustomUnits);

		oBaseUnitMock.expects("formatValue").on(oType)
			.withExactArgs(["78", "G", sinon.match.same(oExpectation.firstCall.args[0][2])], "foo")
			.returns("78 G");

		// code under test: "MDC input scenario": call formatValue with the result of parseValue
		// as "aValues" which leaves the customizing part undefined -> use existing customizing
		assert.strictEqual(oType.formatValue(["78", "G"], "foo"), "78 G");

		assert.deepEqual(oType.mCustomUnits, mCustomUnits);
		assert.strictEqual(oType.mCustomUnits, oTypeCustomUnits);

		mCustomizing2 = {"G" : {Text : "gram", UnitSpecificScale : 1}};
		oBaseUnitMock.expects("formatValue").on(oType)
			.withExactArgs(["77.123", "G", sinon.match.same(oExpectation.firstCall.args[0][2])],
				"foo")
			.returns("77.123 G");

		// code under test: changed customizing reference is ignored
		assert.strictEqual(oType.formatValue(["77.123", "G", mCustomizing2], "foo"), "77.123 G");

		assert.deepEqual(oType.mCustomUnits, mCustomUnits);
		assert.strictEqual(oType.mCustomUnits, oTypeCustomUnits);

		oBaseUnitMock.expects("formatValue").on(oType)
			.withExactArgs(["78", "G", sinon.match.same(oExpectation.firstCall.args[0][2])],
				"foo")
			.returns("78 G");

		// code under test: change customizing to null is ignored
		assert.strictEqual(oType.formatValue(["78", "G", null], "foo"), "78 G");

		assert.deepEqual(oType.mCustomUnits, mCustomUnits);
		assert.strictEqual(oType.mCustomUnits, oTypeCustomUnits);

		oBaseUnitMock.expects("formatValue").on(oType2)
			.withExactArgs(["79", "G", sinon.match.same(oExpectation.firstCall.args[0][2])],
				"foo")
			.returns("79 G");

		// code under test: new type instance reuses customizing
		assert.strictEqual(oType2.formatValue(["79", "G", mCustomizing], "foo"), "79 G");

		assert.deepEqual(oType2.mCustomUnits, mCustomUnits);
		assert.strictEqual(oType2.mCustomUnits, oTypeCustomUnits);
	});

	//*********************************************************************************************
	[false, true, undefined].forEach(function (bParseAsString) {
		QUnit.test("parseValue, parseAsString=" + bParseAsString, function (assert) {
			var mCustomizing = {
					"G" : {Text : "gram", UnitSpecificScale : 3},
					"KG" : {Text : "kilogram", UnitSpecificScale : 2}
				},
				oType = new Unit(bParseAsString !== undefined
					? {parseAsString : bParseAsString} : undefined);

			// make customizing available on type instance so that it can be used in parseValue
			assert.strictEqual(oType.formatValue([42, "KG", mCustomizing], "string"), "42.00 KG");

			this.mock(BaseUnit.prototype).expects("parseValue")
				.withExactArgs("42 KG", "string")
				.on(oType)
				.callThrough();

			// code under test
			assert.deepEqual(oType.parseValue("42 KG", "string"),
				[bParseAsString === false ? 42 : "42", "KG"]);
		});
	});

	//*********************************************************************************************
	QUnit.test("parseValue, error if customizing is unset", function (assert) {
		assert.throws(function () {
			new Unit().parseValue("42 KG", "string");
		}, new Error("Cannot parse value without unit customizing"));
	});

	//*********************************************************************************************
	QUnit.test("validateValue", function (assert) {
		var oType = new Unit();

		assert.throws(function () {
			// code under test
			oType.validateValue(["77", "KG"]);
		}, new Error("Cannot validate value without unit customizing"));

		oType.formatValue(["42", "KG", {"G" : {Text : "gram", UnitSpecificScale : 1}}], "string");

		// code under test
		oType.validateValue(["77", "KG"]);

		oType = new Unit();
		oType.formatValue(["42", "KG", null], "string");

		// code under test
		oType.validateValue(["77", "KG"]);
	});

	//*********************************************************************************************
	QUnit.test("setConstraints not supported", function (assert) {
		assert.throws(function () {
			// code under test
			new Unit().setConstraints({"Minimum" : 42});
		}, new Error("Constraints not supported"));
	});

	//*********************************************************************************************
	QUnit.test("setFormatOptions not supported", function (assert) {
		assert.throws(function () {
			// code under test
			new Unit().setFormatOptions({"parseAsString" : false});
		}, new Error("Format options are immutable"));
	});
});