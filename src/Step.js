var Step = (function () {
    function Step (data, config, complete) {
        this.settings = $.extend({
            doneMethod: function () {}
        }, config);
        this.name = data.name;
        this.data = data.data;
        this.type = this.data.type;
        this.validation = [];
        this.complete = complete || function () {};
        this.validator = $(this.settings.form).validate(this.settings.validatorOptions);
        if (this.type === "endPoint") {
            this.api = this.settings.api;
            this.endPointPath = (this.debug) ? this.data.debug.endPoint : this.data.endPoint;
            this.requiredInputs = this.data.inputs || [];
        }
    }

    Step.prototype.init = function (lastStep, callback) {
        /*
         * Render screens
         * Or call endPoint
         */
        this.lastStep = lastStep || false;
        callback = callback || function () {};
        if (this.lastStep && this.lastStep.settings.progressBtn) {
            this.lastStep.settings.progressBtn.start();
        }
        if (this.type === "endPoint") {
            /* Initialize endPoint */
            this.processData();
            this.endPoint(callback);
            return false;
        } else if (this.section) {
            /* Show section if already rendered */
            this.hideSections();
            this.showSection();
        } else {
            /* Render new section */
            this.processData();
            this.hideSections();
            if (this.settings.formValues) {
                /* Proceed if form filled */
                processStep({ data: this });
            } else {
                this.render();
            }
            callback();
        }
        $('html,body').scrollTop(0);
    };

    Step.prototype.render = function () {
        /*
         * Store last step instance on current step
         * Render current step and bind buttons
         */
        var processStep = this.processStep;
        /* Render New Section */
        this.section = $(this.settings.form).append(this.renderSection()).find(this.settings.section).last();
        /* Add validation rules */
        this.addValidation();
        /* Bind Next Button */
        this.nextButton = $(this.section).find(this.settings.nextButton).on('click', this, processStep);
        /* Initialize Progress Button */
        this.settings.progressBtn = new ProgressButton({
            btn: this.nextButton
        });
        /* Bind Date Picker */
        $(this.section).find(this.settings.dateInput).datepicker(this.settings.datepickerOptions);
        /* Bind Other Buttons */
        $(this.section).find(this.settings.button).on('click', this, function (e) {
            var data = $.extend(e.data, { ref: $(this).attr('data-ref') });
            processStep({ data: data });
        });
        /* Shimit */
        PFJ.shim();
    };

    Step.prototype.showSection = function () {
        this.section.removeClass('hide');
    };

    Step.prototype.hideSections = function () {
        /* Hide Other Sections */
        $(this.settings.form).find(this.settings.section).addClass('hide');
    };

    Step.prototype.renderSection = function () {
        /*
         * Pass data to Handlebars template
         */
        return this.settings.template(this.data);
    };

    Step.prototype.addValidation = function () {
        /*
         * Add custom validation rules
         */
        $.each(this.validation, function (i, value) {
            var input = $( '[name="' + value.name + '"]' );
            input.rules( "add", value.rule);
            if (value.type === "phone") {
                PFJ.phoneMask(input);
            } else if (value.type === "date") {
                PFJ.dateMask(input);
            }
        });

    };

    Step.prototype.processData = function () {
        /*
         * Pass data to custom override funciton
         */
         data = (this.override) ? this.override(this.data) : this.data;
         if (this.type !== "endPoint") {
             data.inputs = prependType(data.inputs);
             data.footer = prependType(data.footer);
         } else {
             this.requiredInputs = data.inputs || [];
         }
         this.data = data;
        return data;
    };

    Step.prototype.processStep = function (e) {
        /*
         * Process step data and render next step
         */
        var currentStep = e.data instanceof Step && e.data || this,
            formValues = currentStep.getFormValues(),
            nextStep = currentStep.getNextStep(formValues),
            lastStep = (currentStep.name === "resend") ? currentStep.lastStep : currentStep,
            stopProgressBtn = function () {
                if (currentStep.settings.progressBtn) {
                    currentStep.settings.progressBtn.finish();
                }
            };
        /* Validate form if next */
        if(/*nextStep && */currentStep.validateSection()) {
            /* Start Processing Next Step */
            currentStep.settings.payload().build(formValues);
            nextStep.done(function (step) {
                step.init(lastStep, stopProgressBtn);
            });
        }

        return false;
    };

    Step.prototype.getNextStep = function (formValues) {
        /*
         * Call complete method and return next step object
         */
        var nextStep = false,
            deferred = $.Deferred();
        if (this.ref) {
            if (this.ref === "resend") {
                this.crawlEndpoints().done($.proxy(function () {
                    this.lastStep.data.result.success = "resend";
                    deferred.resolve(this.lastStep);
                }, this));
            } else {
                deferred.resolve(this.complete(this.ref));
            }
        } else if (this.type !== "endPoint") {
            deferred.resolve(this.complete(this.next(formValues)));
        }
        return deferred.promise();
    };

    Step.prototype.next = function () {
        /*
         * Return function tied to step type
         */
        return this[this.type].apply(this, arguments) || false;
    };

    Step.prototype.decision = function (form) {
        /*
         * Return input value for selected input
         */
        return form[this.data.next];
    };

    Step.prototype.nextStepKey = function () {
        /*
         * Return value for next Step
         */
        return this.data.next || false;
    };

    Step.prototype.input = Step.prototype.nextStepKey;

    Step.prototype.static = Step.prototype.nextStepKey;

    Step.prototype.endPoint = function (callback, bypass) {
        /*
         * Call endpoint with payload and pass response to complete function
         */
        var that = this;
        bypass = bypass || false;
        params = $.extend(this.getPayload(), { 'method': this.endPointPath });
        this.api[this.data.method](params).done(function (res) {
            console.log('success', res.success);
            if (!res.success) {
                that.settings.doneMethod(that.name);
            }
            if (!bypass) {
                var result = $.proxy(that.complete, that, res, that.data.result)();
                if (result) {
                    that.validator.showErrors(result);
                }
            }
        }).always(callback);
        return false;
    };

    Step.prototype.getFormValues = function (filter) {
        /*
         * Returns form values serialized to array
         */
         var formValues = (this.settings.formValues) ? this.settings.formValues : $(this.settings.form).serializeArray();
         if (filter) {
             var filtered = filterFormValues(formValues, filter);
             formValues = filtered.values.concat(filtered.params);
         }
         formValues = this.processInput(formValues);
        return formValues.reduce(arrayToObject, {});
    };

    Step.prototype.validateSection = function (currentStep) {
        /*
         * Validate form section if next is clicked
         */
        if(!this.ref && !this.settings.formValues) {
            this.validator.element($(this.section).find('input, select'));
            return $(this.settings.form).valid();
        }
        return true;
    };

    Step.prototype.getPayload = function () {
        /*
         * Store payload on instance and return
         */
        this.payload = (this.data.payload) ? this.settings.payload().get(this.requiredInputs) : this.getFormValues(this.requiredInputs);
        return this.payload;
    };

    Step.prototype.processInput = function (values) {
        /*
         * Default method for processing form input
         */
         return values;
    };

    Step.prototype.crawlEndpoints = function () {
        var lastStep = this.lastStep,
            responseCount = 0,
            deferred = $.Deferred(),
            updatePayload = $.proxy(function (res) {
                var token;
                if (res.emailToken && res.emailToken.Value) {
                    token = {
                        emailToken: res.emailToken.Value
                    };
                } else if (res.cardToken) {
                    token = {
                        cardToken: res.cardToken
                    };
                }
                this.settings.payload().build(token);
                responseCount--;
                if (!responseCount) {
                    deferred.resolve();
                }
            }, lastStep);
        while (lastStep) {
            if (lastStep.type === "endPoint" && (lastStep.name === "checkEmail" || lastStep.name === "checkCard")) {
                responseCount++;
                lastStep.endPoint(updatePayload, true);
            }
            lastStep = lastStep.lastStep;
        }
        return deferred.promise();
    };

    function filterFormValues (values, inputs) {
        /*
         *  Return form inputs filtered by array
         */
        var inputsByArray = function (value, index) {
                return (inputs.indexOf(value.name) >= 0);
            },
            extractParams = function (value, index) {
                return (typeof value === "object");
            };
        return {
            values: values.filter(inputsByArray),
            params: inputs.filter(extractParams)
        };
    }

    function arrayToObject (obj, item) {
        /*
         * Reduce array to object with key -> value pairs
         */
        obj[item.name] = item.value;
        return obj;
    }

    function prependType (partials) {
        /*
         * Prepends 'registration.' to type property of step partials
         */
        if (partials) {
            return partials.map(function (input) {
                input.type = "registration." + input.type;
                return input;
            });
        } else {
            return null;
        }
    }

    return Step;
})();
