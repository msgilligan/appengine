var	JText = Packages.com.google.appengine.api.datastore.Text,
	JBlob = Packages.com.google.appengine.api.datastore.Blob,
	JGeoPt = Packages.com.google.appengine.api.datastore.GeoPt;

var jcontext = Packages.org.mozilla.javascript.Context.getCurrentContext(),
    JArrays = Packages.java.util.Arrays,
    JArrayList = java.util.ArrayList;

var ByteString = require("binary").ByteString;

var BadValueError = require("google/appengine/ext/db/errors").BadValueError;

var types = require("google/appengine/api/datastore/types"),
    Key = types.Key,
    GeoPt = types.GeoPt;

var util = require("util"),
    utils = require("google/appengine/utils");

// property constructor helper.
var _makeProperty = function (ctor, options) {
    var p = Object.create(ctor.prototype);
    for (var i in options) p[i] = options[i];
    if (p.required == undefined) p.required = false;
    if (p.indexed == undefined) p.indexed = true;
    return p;
}
    
/**
 * The Property class is the superclass of property definitions for data models. 
 * A Property class defines the type of a property's value, how values are 
 * validated, and how values are stored in the datastore.
 *
 * Arguments:
 * - verboseName
 * - name
 * - defaultValue
 * - required
 * - validator
 * - choices
 * - indexed
 */
var Property = exports.Property = function (options) {
    for (var i in options) this[i] = options[i];
    if (this.required == undefined) this.required = false;
    if (this.indexed == undefined) this.indexed = true;
}

Property.prototype.verbose = function () {
    return (this.verboseName || util.title(this.name));
}

Property.prototype.validate = function (value) {
    if (this.empty(value)) {
        if (this.required) throw new BadValueError(this.verbose() + " is required");    
    } else {
        if (this.choices) {
            var match = false;
            for (var i = 0; i < this.choices.length; i++) 
                if (this.choices[i] == value) match = true;
            if (!match)
                throw new BadValueError(this.verbose() + " is " + value + "; must be one of " + this.choices);
        }
    }

    if (this.validator) this.validator(value); // hmm, maybe return here?
    
    return value;
}

Property.prototype.empty = function (value) {
    return value == undefined || value == null;
}

Property.prototype._attrName = function () {
    return this.name;
}

/**
 * 
 */
var StringProperty = exports.StringProperty = function (options) {
    return _makeProperty(StringProperty, options);
}

utils.extend(StringProperty, Property);

StringProperty.prototype.init = function (constructor) {
}

StringProperty.prototype.getValueForDatastore = function (obj) {
    return obj[this.name] || this.defaultValue;
}

StringProperty.prototype.makeValueFromDatastore = function (value) {
    return String(value);
}

StringProperty.prototype.empty = function (value) {
    return value == undefined || value == null || (value.length < 1);
}

/**
 * 
 */
var BooleanProperty = exports.BooleanProperty = function (options) {
    return _makeProperty(BooleanProperty, options);
}

utils.extend(BooleanProperty, Property);

BooleanProperty.prototype.init = function (constructor) {
}

BooleanProperty.prototype.getValueForDatastore = function (obj) {
    var value = obj[this.name];
    
    if (value == undefined) {
        return this.defaultValue;
    } else {
        return value;
    }
}

BooleanProperty.prototype.makeValueFromDatastore = function (value) {
	return value.booleanValue();
}

/**
 * 
 */
var IntegerProperty = exports.IntegerProperty = function (options) {
    return _makeProperty(IntegerProperty, options);
}

utils.extend(IntegerProperty, Property);

IntegerProperty.prototype.init = function (constructor) {
}

IntegerProperty.prototype.getValueForDatastore = function (obj) {
    var val = obj[this.name];
    
    if (val == undefined) {
        if (this.defaultValue == undefined) {
            return null;
        } else {
            val = this.defaultValue;
        }
    }
    
//    return new JInteger(val);  !!! < 2^31 
    return val;
}

IntegerProperty.prototype.makeValueFromDatastore = function (value) {
	return Number(value);
}

/**
 * 
 */
var FloatProperty = exports.FloatProperty = function (options) {
    return _makeProperty(FloatProperty, options);
}

utils.extend(FloatProperty, Property);

FloatProperty.prototype.init = function (constructor) {
}

FloatProperty.prototype.getValueForDatastore = function (obj) {
    var val = obj[this.name];
    
    if (val == undefined) {
        if (this.defaultValue == undefined) {
            return null;
        } else {
            val = this.defaultValue;
        }
    }
    
    return val;
}

FloatProperty.prototype.makeValueFromDatastore = function (value) {
 	return Number(value);
}

/**
 * 
 */
var DateProperty = exports.DateProperty = function (options) {
    return _makeProperty(DateProperty, options);
}

utils.extend(DateProperty, Property);

var JDate = java.util.Date;

DateProperty.prototype.init = function (constructor) {
}

DateProperty.prototype.getValueForDatastore = function (obj) {
    var value = this.autoNow ? new Date() : obj[this.name]; // THINK: is this correct?

	if (value) {
		return new JDate(value.getTime());
	} else {
	    return this.autoNowAdd ? new JDate(new Date().getTime()) : null;
    }	    
}

DateProperty.prototype.makeValueFromDatastore = function (value) {
	if (value) {
		return new Date(value.getTime());
	} else {
		return null;
    }		
}

/**
 * 
 */
var DateTimeProperty = exports.DateTimeProperty = DateProperty;
DateTimeProperty.constructor = DateTimeProperty;

/**
 * 
 */
var TimeProperty = exports.TimeProperty = DateProperty;
TimeProperty.constructor = TimeProperty;

/**
 * A list of values of the type given as item_type.
 * In a query, comparing a list property to a value performs the test against 
 * the list members: list_property = value tests if the value appears anywhere 
 * in the list, list_property < value tests if any of the members of the list 
 * are less than the given value, and so forth.
 * A query cannot compare two list values. There is no way to test two lists for 
 * equality without testing each element for membership separately.
 */
// FIXME: pass type/ctor of elements. 
var ListProperty = exports.ListProperty = function (options) {
    return _makeProperty(ListProperty, options);
}

utils.extend(ListProperty, Property);

ListProperty.prototype.init = function (constructor) {
}

ListProperty.prototype.getFilterValue = function (val) {
    return val;
}

ListProperty.prototype.getValueForDatastore = function (obj) {
    var items = obj[this.name] || this.defaultValue || [];    
    var list = new JArrayList(items.length);
    for (var i = 0; i < items.length; i++) list.add(items[i]);

    return list;
}

ListProperty.prototype.makeValueFromDatastore = function (value) {
	return value ? jcontext.newArray(global, value.toArray()) : null;
}

/**
 * 
 */
var StringListProperty = exports.StringListProperty = function (options) {
    return _makeProperty(StringListProperty, options);
}

utils.extend(StringListProperty, ListProperty);

/**
 * A reference to another model instance. For example, a reference may indicate 
 * a many-to-one relationship between the model with the property and the model 
 * referenced by the property.
 *
 * Extra options:
 *  - referenceClass
 *  - collectionName
 * 
 * Examples:
 *  category: new DB.ReferenceProperty(Category);
 *  author: new DB.ReferenceProperty(User, {collectionName: "articles"}); 
 */
var ReferenceProperty = exports.ReferenceProperty = function (class_or_options, options) {
    if (options) {
        if (class_or_options && class_or_options._kind && class_or_options._properties) {
            options.referenceClass = class_or_options;
        } else {
            throw Error("The first argument must be a Kind");
        }            
        return _makeProperty(ReferenceProperty, options);
    } else {
        return _makeProperty(ReferenceProperty, class_or_options);
    }
}

utils.extend(ReferenceProperty, Property);

var capFirst = function (str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
}

ReferenceProperty.prototype.init = function (constructor) {
    var idName = "_" + this.name,
        resolvedName = "_RESOLVED" + idName,
        kind = this.referenceClass;

    if (kind) {
        Object.defineProperty(constructor.prototype, this.name, {
            get: function () {
                if (!this[idName]) return undefined;
                
                if (this[resolvedName] == undefined) {
                    var value = kind.get(this[idName]);
                    if (!value) throw new Error("ReferenceProperty failed to be resolved");
                    this[resolvedName] = value;
                } 
                
                return this[resolvedName];
            },
            set: function (value) { // val = key or model
                if (value) {
                    if (value.constructor == Key) {
                        this[idName] = value;
                        this[resolvedName] = undefined;
                    } else {
                        this[idName] = value.key();
                        this[resolvedName] = value;                    
                    }
                } else {
                    this[idName] = undefined;
                    this[resolvedName] = undefined;                                    
                }                    
            },
            enumerable: true
        });

        this.collectionName = this.collectionName || constructor.kind().toLowerCase() + "Set";
        var name = this.name;
        Object.defineProperty(this.referenceClass.prototype, this.collectionName, {
            get: function () {
                return constructor.all().filter(name + " =", this);
            }, 
            configurable: true // FIXME: ???
        });
    } else {
        // FIXME: think what to do!
        Object.defineProperty(constructor.prototype, this.name, {
            get: function () {
                if (!this[idName]) return undefined;
                
                if (this[resolvedName] == undefined) {
                    var value = require("google/appengine/ext/db").get(this[idName]);
                    if (!value) throw new Error("ReferenceProperty failed to be resolved");
                    this[resolvedName] = value;
                } 
                
                return this[resolvedName];
            },
            set: function (value) { // val = key or model
                if (value) {
                    if (value.constructor == Key) {
                        this[idName] = value;
                        this[resolvedName] = undefined;
                    } else {
                        this[idName] = value.key();
                        this[resolvedName] = value;                    
                    }
                } else {
                    this[idName] = undefined;
                    this[resolvedName] = undefined;                                    
                }                    
            },
            enumerable: true
        });
    }        
}

// TODO: enforce referenceClass !!!
ReferenceProperty.prototype.getValueForDatastore = function (obj) {
    var value = obj[this.name];
    return value ? value.datastoreKey() : null;
}

ReferenceProperty.prototype.makeValueFromDatastore = function (value) {
    return Key.fromDatastoreKey(value);
}

/**
 * ReferenceProperty Alias.
 */
exports.Reference = ReferenceProperty;

/**
 * A user with a Google account.
 * If autoCurrentUser is true, the property value is set to the currently 
 * signed-in user whenever the model instance is stored in the datastore, 
 * overwriting the property's previous value. This is useful for tracking which 
 * user modifies a model instance.
 * If autoCurrentUserAdd is true, the property value is set to the currently 
 * signed-in user the first time the model instance is stored in the datastore, 
 * unless the property has already been assigned a value. This is useful for 
 * tracking which user creates a model instance, which may not be the same 
 * user that modifies it later.
 * UserProperty does not accept a default value. Default values are set when 
 * the model class is first imported, and with import caching may not be the 
 * currently signed-in user.
 */
var UserProperty = exports.UserProperty = function (options) {
    return _makeProperty(UserProperty, options);
}

utils.extend(UserProperty, Property);

UserProperty.prototype.init = function (constructor) {
}

UserProperty.prototype.getValueForDatastore = function (obj) {
    return new Error("not implemented");
}

UserProperty.prototype.makeValueFromDatastore = function (value) {
    return new Error("not implemented");
}

/**
 * A binary data property.
 * Blob data is a byte string. For text data, which may involve encoding, 
 * use TextProperty.
 */
var BlobProperty = exports.BlobProperty = function (options) {
    var p = _makeProperty(BlobProperty, options);
    p.indexed = false;    
    return p;
}

utils.extend(BlobProperty, Property);

BlobProperty.prototype.init = function (constructor) {
}

BlobProperty.prototype.getValueForDatastore = function (obj) {
    return new JBlob(obj[this.name]._bytes);
}

BlobProperty.prototype.makeValueFromDatastore = function (value) {
    var b = new ByteString();
    b._bytes = value.getBytes();
    b._offset = 0;
    b._length = Number(b._bytes.length);
    return b;
}

/**
 *
 */
var TextProperty = exports.TextProperty = function (options) {
    var p = _makeProperty(TextProperty, options);
    p.indexed = false;    
    return p;
}

utils.extend(TextProperty, Property);

TextProperty.prototype.init = function (constructor) {
}

TextProperty.prototype.getValueForDatastore = function (obj) {
    var text = obj[this.name] || this.defaultValue;
    return text ? JText(text) : undefined;
}

TextProperty.prototype.makeValueFromDatastore = function (value) {
    return String(value.getValue());
}

TextProperty.prototype.empty = function (value) {
    return value == undefined || value == null || (value.length < 1);
}

/**
 * A tag, ie a descriptive word or phrase. Entities may be tagged by users,
 * and later returned by a queries for that tag. Tags can also be used for
 * ranking results (frequency), photo captions, clustering, activity, etc. 
 */
var CategoryProperty = exports.CategoryProperty = function (options) {
    return _makeProperty(CategoryProperty, options);
}

utils.extend(CategoryProperty, StringProperty);

/**
 * A fully qualified URL. Usually http: scheme, but may also be file:, ftp:,
 * news:, among others.
 */
var LinkProperty = exports.LinkProperty = function (options) {
    return _makeProperty(LinkProperty, options);
}

utils.extend(LinkProperty, StringProperty);

/**
 *
 */
var EmailProperty = exports.EmailProperty = function (options) {
    return _makeProperty(EmailProperty, options);
}

utils.extend(EmailProperty, StringProperty);

/**
 * 
 */
var GeoPtProperty = exports.GeoPtProperty = function (options) {
    return _makeProperty(GeoPtProperty, options);
}

utils.extend(GeoPtProperty, Property);

GeoPtProperty.prototype.init = function (constructor) {
}

GeoPtProperty.prototype.getValueForDatastore = function (obj) {
    var pt = obj[this.name] || this.defaultValue;
    return new JGeoPt(pt.lat, pt.lon);
}

GeoPtProperty.prototype.makeValueFromDatastore = function (value) {
 	return new GeoPt(value.getLatitude(), value.getLongitude());
}

/**
 *
 */
var PhoneNumberProperty = exports.PhoneNumberProperty = StringProperty;
PhoneNumberProperty.constructor = PhoneNumberProperty;

/**
 *
 */
var PostalAddressProperty = exports.PostalAddressProperty = StringProperty;
PostalAddressProperty.constructor = PostalAddressProperty;

/**
 *
 */
var RatingProperty = exports.RatingProperty = IntegerProperty;
RatingProperty.constructor = RatingProperty;

