// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

CouchDB.host = "127.0.0.1:5984";
CouchDB.protocol = "http://";


function TEquals(expected, actual, testName) {
  T(equals(expected, actual), "expected '" + repr(expected) +
    "', got '" + repr(actual) + "'", testName);
}

function TEqualsIgnoreCase(expected, actual, testName) {
  T(equals(expected.toUpperCase(), actual.toUpperCase()), "expected '" + repr(expected) +
    "', got '" + repr(actual) + "'", testName);
}

function equals(a,b) {
  if (a === b) return true;
  try {
    return repr(a) === repr(b);
  } catch (e) {
    return false;
  }
}

function repr(val) {
  if (val === undefined) {
    return null;
  } else if (val === null) {
    return "null";
  } else {
    return JSON.stringify(val);
  }
}

function makeDocs(start, end, templateDoc) {
  var templateDocSrc = templateDoc ? JSON.stringify(templateDoc) : "{}";
  if (end === undefined) {
    end = start;
    start = 0;
  }
  var docs = [];
  for (var i = start; i < end; i++) {
    var newDoc = eval("(" + templateDocSrc + ")");
    newDoc._id = (i).toString();
    newDoc.integer = i;
    newDoc.string = (i).toString();
    docs.push(newDoc);
  }
  return docs;
}

function run_on_modified_server(settings, fun) {
  try {
    // set the settings
    for(var i=0; i < settings.length; i++) {
      var s = settings[i];
      var xhr = CouchDB.request("PUT", "/_config/" + s.section + "/" + s.key, {
        body: JSON.stringify(s.value),
        headers: {"X-Couch-Persist": "false"}
      });
      CouchDB.maybeThrowError(xhr);
      s.oldValue = xhr.responseText;
    }
    // run the thing
    fun();
  } finally {
    // unset the settings
    for(var j=0; j < i; j++) {
      var s = settings[j];
      if(s.oldValue == "\"\"\n") { // unset value
        CouchDB.request("DELETE", "/_config/" + s.section + "/" + s.key, {
          headers: {"X-Couch-Persist": "false"}
        });
      } else {
        CouchDB.request("PUT", "/_config/" + s.section + "/" + s.key, {
          body: s.oldValue,
          headers: {"X-Couch-Persist": "false"}
        });
      }
    }
  }
}


function waitForRestart() {
  var waiting = true;
  while (waiting) {
    try {
      CouchDB.request("GET", "/");
      CouchDB.request("GET", "/");
      waiting = false;
    } catch(e) {
      // the request will fail until restart completes
    }
  }
};

function restartServer() {
  var xhr;
  try {
    CouchDB.request("POST", "/_restart");
  } catch(e) {
    // this request may sometimes fail
  }
  waitForRestart();
}

function stringFun(fun) {
  var string = fun.toSource ? fun.toSource() : "(" + fun.toString() + ")";
  return string;
}

function waitForSuccess(fun, tag) {
  var start = new Date();
  while(true) {
    if (new Date() - start > 5000) {
      throw("timeout: "+tag);
    } else {
      try {
        fun();
        break;
      } catch (e) {}
      // sync http req allow async req to happen
      CouchDB.request("GET", "/test_suite_db/?tag="+encodeURIComponent(tag));
    }
  }
}

CouchDB.urlPrefix = "..";
var couchTests = {};
