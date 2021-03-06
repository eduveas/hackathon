/**
 * Extend the String object with a 'startsWith' method
 */
if (typeof String.prototype.startsWith !== 'function') {
    /**
     * Checks, if a string-object starts with the provided term
     * @global
     * @param {String} str the term to check
     * @returns {Boolean} true, if the string starts with the provided term, otherwise false
     */
    String.prototype.startsWith = function(str) {
        return this.slice(0, str.length) === str;
    };
}

var EEXCESS = EEXCESS || {};

/**
 * Sends a query with the specified parameters to europeana and hands the results
 * to the success callback or the error message to the error callback.
 * @memberOf EEXCESS
 * @param {String} query The query term 
 * @param {Integer} start Item in the results to start with (first item is 1)
 * @param {querySuccess} success callback on success
 * @param {queryError} error callback on error
 */
EEXCESS.euCall = function(weightedTerms, start, success, error) {
    var query = '';
    for (i = 0; i < 3; i++) {
        if (typeof weightedTerms[i] !== 'undefined') {
            query += weightedTerms[i].text + ' ';
        } else {
            break;
        }
    }
    var x = [];
    console.log(typeof x);
    var _facets = function(item) {
        var facet_list = {};
        var facets = [
            'type',
            'subject',
            'year',
            'language',
            'provider',
            'contributor',
            'dataProvider',
            'rights',
            'ugc',
            'usertags'
        ];
        for (var i = 0, len = facets.length; i < len; i++) {
            var key = facets[i];
            if (typeof item[key] !== "undefined") {
                if (typeof item[key] === "object") {
                    facet_list[key] = item[key][0];
                } else {
                    facet_list[key] = item[key];
                }
            }
        }
        return facet_list;
    };
    console.log('query: ' + query + ' start:' + start);
    var xhr = $.ajax(EEXCESS.backend.getURL()
            + '&query=' + query
            + '&start=' + start
            + '&rows=96&profile=standard');
    xhr.done(function(data) {
        console.log(data);
        if (data.totalResults !== 0) {
            $.map(data.items, function(n, i) {
                n.uri = n.guid;
                n.previewImage = n.edmPreview;
                delete n.edmPreview;
            });
            data.results = data.items;
            delete data.items;
            for (var i = 0, len = data.results.length; i < len; i++) {
                data.results[i].facets = _facets(data.results[i]);
                data.results[i].facets.provider = 'Europeana';
                if (data.results[i].title instanceof Array) {
                    data.results[i].title = data.results[i].title[0];
                }
            }
        }
        console.log(data);
        success(data);
    });
    xhr.fail(function(textStatus) {
        error(textStatus.statusText);
    });
};

EEXCESS.frCall_impl = function(weightedTerms, start, success, error) {
    console.log('start:' + start + 'query: ');
    console.log(weightedTerms);
    var profile = {
        "eexcess-user-profile": {
            "interests": {
                "interest": []
            },
            "context-list": {
                "context": weightedTerms
            }
        }
    };
    console.log(profile);
    var xhr = $.ajax({
        url: EEXCESS.backend.getURL(),
        data: JSON.stringify(profile),
        type: 'POST',
        contentType: 'application/json; charset=UTF-8',
        dataType: 'json',
        headers: {Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}
    });
    xhr.done(function(data) {
        console.log(data);
        success(data);
    });
    xhr.fail(function(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR);
        console.log(textStatus);
        console.log(errorThrown);
        error(textStatus);
    });
};


// set provider call function and url according to the provided value 
// if an inappropriate value is given, set it to fr-stable
EEXCESS.backend = (function() {
    var call = EEXCESS.frCall_impl;
    var url = 'http://eexcess.joanneum.at/eexcess-privacy-proxy/api/v1/recommend';
    var fr_url = 'http://eexcess.joanneum.at/eexcess-privacy-proxy/api/v1/recommend';
    var backend = 'fr-stable';

    return {
        setProvider: function(tabID, provider) {
            backend = provider;
            if (typeof (Storage) !== 'undefined') {
                localStorage.setItem('backend', provider);
            }
            switch (provider) {
                case 'eu':
                    console.log('eu');
                    call = EEXCESS.euCall;
                    url = 'http://europeana.eu/api//v2/search.json?wskey=HT6JwVWha';
                    break;
                case 'fr-devel':
                    console.log('fr-devel');
                    call = EEXCESS.frCall_impl;
                    url = 'http://eexcess-dev.joanneum.at/eexcess-privacy-proxy/api/v1/recommend';
                    break;
                case 'fr-stable':
                    console.log('fr-stable');
                    call = EEXCESS.frCall_impl;
                    url = 'http://eexcess.joanneum.at/eexcess-privacy-proxy/api/v1/recommend';
                    break;
                case 'self':
                    console.log('self');
                    call = EEXCESS.frCall_impl;
                    url = 'http://eexcess.joanneum.at/eexcess-privacy-proxy/api/v1/recommend';
                    fr_url = url;
                    if (typeof (Storage) !== 'undefined') {
                        var local_url = localStorage.getItem('local_url');
                        if (typeof local_url !== 'undefined' && local_url !== null) {
                            url = local_url;
                        }
                        var local_fr_url = localStorage.getItem('federated_url');
                        if (typeof local_fr_url !== 'undefined' && local_fr_url !== null) {
                            fr_url = local_fr_url;
                        }
                    }
            }
        },
        setURL: function(tabID, urls) {
            if (typeof (Storage) !== 'undefined') {
                localStorage.setItem('local_url', urls.pp);
                localStorage.setItem('federated_url', urls.fr);
            }
            url = urls.pp;
            fr_url = urls.fr;
        },
        getURL: function() {
            if(backend === 'self') {
                return (url + '?fr_url=' + fr_url);
            }
            return url;
        },
        getCall: function() {
            return call;
        }
    };
}());

// retrieve provider from local storage or set it to 'fr-stable'
if (typeof (Storage) !== 'undefined') {
    EEXCESS.backend.setProvider(-1, localStorage.getItem('backend'));
} else {
    EEXCESS.backend.setProvider(-1, 'fr-stable');
}