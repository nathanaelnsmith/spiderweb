# spiderweb
A multi-step omni-direction form builder.

## Example Usage
This is an excerpt, so not all variables are defined.
```
var stepConfig = {
    form: form,
    validatorOptions: validatorOptions,
    payload: function () {
        return payload;
    },
    section: section,
    nextButton: nextButton,
    button: button,
    dateInput: dateInput,
    datepickerOptions: datepickerOptions
};
var checkCard = new Step(
    {
		"type": "endPoint",
		"endPoint": "GetCardStatus",
		"method": "get",
		"inputs": [
			"cardNumber"
		],
		"result": {
			"success": "email",
			"invalid": { "cardNumber": "Your card is invalid." }
		}
	},
    stepConfig,
    function (res, result) {
        payload.build({
            cardNumber: this.getFormValues().card,
            cardToken: res.cardToken,
            cardType: res.cardType
        });
        result[res.status].init(this);
        return false;
    });
var email = new Step(
    {
		"type": "input",
		"title": "Please enter an E-mail.",
		"label": "Enter an E-mail for this account",
		"inputs": [
			{
				"type": "text",
				"name": "email",
				"label": "E-mail",
				"required": true
			}
		],
		"next": "checkEmail"
	}, stepConfig, getStep);
```
