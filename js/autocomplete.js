/*
    JavaScript autoComplete v1.0.4
    Copyright (c) 2014 Simon Steinberger / Pixabay
    GitHub: https://github.com/Pixabay/JavaScript-autoComplete
    License: http://www.opensource.org/licenses/mit-license.php
    Heavily edited by Adam Chyb 2016
*/

var autoComplete = (function() {
    // "use strict";
    function autoComplete(options) {
        if (!document.querySelector) return;

        // helpers
        function addEvent(el, type, handler) {
            if (el.attachEvent) el.attachEvent('on' + type, handler);
            else el.addEventListener(type, handler);
        }

        function removeEvent(el, type, handler) {
            // if (el.removeEventListener) not working in IE11
            if (el.detachEvent) el.detachEvent('on' + type, handler);
            else el.removeEventListener(type, handler);
        }

        var o = {
            selector: 0,
            source: 0,
            minChars: 3,
            delay: 150,
            offsetLeft: 0,
            offsetTop: 1,
            cache: 1,
            menuClass: '',
            renderItem: function(item, search) {
                // escape special characters
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
                return '<div class="autocomplete-suggestion" data-val="' + item + '">' + item.replace(re, "<b>$1</b>") + '</div>';
            },
            clearItems: function() {},
            onSelect: function(e, term, item) {},
            onControlKey: function(keyCode) {}
        };
        for (var k in options) {
            if (options.hasOwnProperty(k)) o[k] = options[k];
        }

        // init
        var elems = typeof o.selector == 'object' ? [o.selector] : document.querySelectorAll(o.selector);
        for (var i = 0; i < elems.length; i++) {
            var that = elems[i];
            that.cache = {};
            that.last_val = '';

            var suggest = function(val, data) {
                that.cache[val] = data;
                o.clearItems();
                if (data.length && val.length >= o.minChars) {
                    for (var i = 0; i < data.length; i++) {
                        var item = o.renderItem(data[i], val);
                        addEvent(item, 'click', o.onSelect);
                    }
                }
            }

            that.keydownHandler = function(e) {
                var key = window.event ? e.keyCode : e.which;
                // down, up, enter
                if (key == 40 || key == 38 || key == 13 || key == 9) {
                    o.onControlKey(that, key);
                }
            };
            addEvent(that, 'keydown', that.keydownHandler);

            that.keyupHandler = function(e) {
                var key = window.event ? e.keyCode : e.which;
                if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
                    var val = that.value;
                    if (val.length >= o.minChars) {
                        if (val != that.last_val) {
                            that.last_val = val;
                            clearTimeout(that.timer);
                            if (o.cache) {
                                if (val in that.cache) {
                                    suggest(val, that.cache[val]);
                                    return;
                                }
                                // no requests if previous suggestions were empty
                                for (var i = 1; i < val.length - o.minChars; i++) {
                                    var part = val.slice(0, val.length - i);
                                    if (part in that.cache && !that.cache[part].length) {
                                        suggest(val, []);
                                        return;
                                    }
                                }
                            }
                            that.timer = setTimeout(function() {
                                o.source(val, suggest)
                            }, o.delay);
                        }
                    } else {
                        that.last_val = val;
                        o.clearItems();
                    }
                }
            };
            addEvent(that, 'keyup', that.keyupHandler);

            that.focusHandler = function(e) {
                that.last_val = '\n';
                that.keyupHandler(e)
            };
            if (!o.minChars) addEvent(that, 'focus', that.focusHandler);
        }

        // public destroy method
        this.destroy = function() {
            for (var i = 0; i < elems.length; i++) {
                var that = elems[i];
                removeEvent(window, 'resize', that.updateSC);
                removeEvent(that, 'blur', that.blurHandler);
                removeEvent(that, 'focus', that.focusHandler);
                removeEvent(that, 'keydown', that.keydownHandler);
                removeEvent(that, 'keyup', that.keyupHandler);
                if (that.autocompleteAttr)
                    that.setAttribute('autocomplete', that.autocompleteAttr);
                else
                    that.removeAttribute('autocomplete');
                document.body.removeChild(that.sc);
                that = null;
            }
        };
    }
    return autoComplete;
})();

(function() {
    if (typeof define === 'function' && define.amd)
        define('autoComplete', function() {
            return autoComplete;
        });
    else if (typeof module !== 'undefined' && module.exports)
        module.exports = autoComplete;
    else
        window.autoComplete = autoComplete;
})();
