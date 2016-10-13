var Payload = (function () {
    function Payload (payload) {
        /*
         * Store default payload structure
         */
        this.payload = payload;
    }

    Payload.prototype.build = function (values) {
        /*
         * Loop through array of key/value objects and stores it on payload object
         */
        var that = this;
        $.each(values, function (name, value) {
            if (that.payload.hasOwnProperty(name)) {
                that.payload[name] = value;
            } else {
                var separator = name.lastIndexOf("."),
                    structure = name.substring(0, separator),
                    structureName = name.substring(separator + 1);
                if (separator >= 0) {
                    that.setStructure(structure, structureName, value);
                }
            }
        });
    };

    Payload.prototype.setStructure = function (structure, name, value) {
        /*
         * Stores demographic values in demographic object
         */
        var that = this;
        $.each(that.payload[structure], function (i) {
            if (that.payload[structure][i].Name === name) {
                that.payload[structure][i].Result = value;
            }
        });
    };

    Payload.prototype.addStructure = function (structure, value) {
        /*
         * Stores demographic object in payload
         */
        this.payload[structure].push(value);
    };

    Payload.prototype.get = function (prop) {
        /*
         * Returns specified payload property or entire object
         */
        return this.payload[prop] || this.payload;
    };

    return Payload;
})();
