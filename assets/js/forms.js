// ============================================================
//  FORM BASE URL
//  Change this to point forms to a different backend.
//  In Publii preview mode it auto-switches to localhost:5000.
// ============================================================
var FORM_BASE_URL = 'https://backend.naturapsa.pl';
var FORM_PREVIEW_URL = 'http://localhost:19331';

var activeBase = (window.PUBLII_PREVIEW && FORM_PREVIEW_URL) ? FORM_PREVIEW_URL : FORM_BASE_URL;

var FORM_ENDPOINTS = {
    'form-live-consultation': '/umow-spotkanie-na-zywo',
    'form-online-consultation': '/umow-spotkanie-online',
    'form-social-walk': '/spacer-socjalizacyjny',
    'form-contact': '/contact',
    'form-separation-therapy': '/lek-separacyjny'
};

function submitFormById(formId) {
    var form = document.getElementById(formId);
    if (form) {
        var event = new Event('submit', { cancelable: true });
        form.dispatchEvent(event);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    var wrapper = document.querySelector('.consultation-form-wrapper');
    if (!wrapper) return;

    var typeSelector = wrapper.querySelector('.consultation-type-selector');
    var successMsg = wrapper.querySelector('.consultation-success');
    var forms = {};

    if (typeSelector) {
        var typeRadios = typeSelector.querySelectorAll('input[name="consultation-type"]');
        var formContainers = wrapper.querySelectorAll('.consultation-form');

        formContainers.forEach(function (fc) {
            if (fc.id) forms[fc.id] = fc;
        });

        function showForm(type) {
            Object.keys(forms).forEach(function (key) {
                forms[key].style.display = 'none';
            });

            var targetId = type + '-consultation-form';

            if (type === 'social') {
                targetId = 'social-walk-form';
            }

            if (forms[targetId]) {
                forms[targetId].style.display = 'block';
            }

            if (successMsg) successMsg.style.display = 'none';
            typeSelector.style.display = 'block';
        }

        typeRadios.forEach(function (radio) {
            radio.addEventListener('change', function () {
                showForm(this.value);
            });
        });

        showForm('live');
    }

    setupConditionalFields(wrapper);

    wrapper.querySelectorAll('.consultation-form form').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var container = form.closest('.consultation-form');
            if (!container) return;

            clearErrors(container);

            var isValid = validateForm(container);

            var summary = container.querySelector('.error-summary');
            var summaryList = summary ? summary.querySelector('ul') : null;

            if (!summaryList && summary) {
                summaryList = document.createElement('ul');
                summary.appendChild(summaryList);
            }

            if (summaryList) summaryList.innerHTML = '';

            if (!isValid) {
                populateErrorSummary(container, summary, summaryList);
                summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            if (summary) summary.classList.remove('is-visible');

            var submitBtn = form.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Wysyłanie...';
            }

            if (typeof grecaptcha !== 'undefined' && window.RECAPTCHA_SITE_KEY) {
                grecaptcha.ready(function () {
                    grecaptcha.execute(window.RECAPTCHA_SITE_KEY, { action: 'submit' }).then(function (token) {
                        var oldInput = form.querySelector('input[name="g-recaptcha-response"]');
                        if (oldInput) oldInput.remove();

                        var hiddenInput = document.createElement('input');
                        hiddenInput.type = 'hidden';
                        hiddenInput.name = 'g-recaptcha-response';
                        hiddenInput.value = token;
                        form.appendChild(hiddenInput);
                        sendForm(form, container, submitBtn);
                    });
                });
            } else {
                sendForm(form, container, submitBtn);
            }
        });
    });

    function sendForm(form, container, submitBtn) {
        var endpoint = FORM_ENDPOINTS[form.id] || '';
        var action = activeBase + endpoint;
        var request = new XMLHttpRequest();
        request.open('POST', action);

        request.onreadystatechange = function () {
            if (request.readyState !== XMLHttpRequest.DONE) return;
            var ok = request.status >= 200 && request.status < 300;

            if (ok) {
                if (typeSelector) {
                    Object.keys(forms).forEach(function (key) {
                        forms[key].style.display = 'none';
                    });
                    typeSelector.style.display = 'none';
                } else {
                    container.style.display = 'none';
                }

                if (successMsg) {
                    successMsg.style.display = 'block';
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Wyślij';
                }

                var summary = container.querySelector('.error-summary');
                if (summary) {
                    var summaryText = summary.querySelector('p');
                    if (summaryText) {
                        summaryText.textContent = 'Nie udało się wysłać formularza. Spróbuj ponownie później.';
                    }
                    summary.classList.add('is-visible');
                }
            }
        };

        request.send(new FormData(form));
    }

    function setupConditionalFields(root) {
        var groups = root.querySelectorAll('.conditional-group');

        groups.forEach(function (group) {
            var triggerName = group.getAttribute('data-trigger');
            var targetValue = group.getAttribute('data-value');

            if (!triggerName || !targetValue) return;

            var triggers = root.querySelectorAll('input[name="' + triggerName + '"]');

            triggers.forEach(function (trigger) {
                trigger.addEventListener('change', function () {
                    if (this.value === targetValue) {
                        group.style.display = 'block';
                    } else {
                        group.style.display = 'none';
                        clearFields(group);
                    }
                });
            });
        });
    }

    function clearFields(container) {
        container.querySelectorAll('input, textarea').forEach(function (el) {
            el.value = '';
            el.checked = false;
            var fieldEl = el.closest('.form-field');
            if (fieldEl) {
                fieldEl.classList.remove('error');
                var errorMsg = fieldEl.querySelector('.error-message');
                if (errorMsg) errorMsg.textContent = '';
            }
        });
    }

    function isHiddenField(input) {
        var el = input;

        while (el && el !== document.body) {
            if (el.classList && el.classList.contains('conditional-group') && el.style.display === 'none') {
                return true;
            }

            el = el.parentElement;
        }

        return false;
    }

    function clearErrors(container) {
        container.querySelectorAll('.form-field').forEach(function (field) {
            field.classList.remove('error');
            var errorMsg = field.querySelector('.error-message');
            if (errorMsg) errorMsg.textContent = '';
        });

        var summary = container.querySelector('.error-summary');
        if (summary) summary.classList.remove('is-visible');
    }

    function setFieldError(field, message) {
        if (!field) return;
        field.classList.add('error');
        var errorMsg = field.querySelector('.error-message');
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            field.appendChild(errorMsg);
        }
        errorMsg.textContent = message;
    }

    function validateForm(container) {
        var isValid = true;

        container.querySelectorAll('input[required], textarea[required]').forEach(function (input) {
            if (isHiddenField(input)) return;

            var field = input.closest('.form-field');

            if (input.type === 'checkbox') {
                if (!input.checked) {
                    isValid = false;
                    setFieldError(field, 'To pole jest wymagane');
                }
            } else if (!input.value.trim()) {
                isValid = false;
                setFieldError(field, 'To pole jest wymagane');
            }
        });

        container.querySelectorAll('input[type="email"]').forEach(function (input) {
            if (isHiddenField(input)) return;
            if (input.required && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
                isValid = false;
                setFieldError(input.closest('.form-field'), 'Podaj poprawny adres e-mail');
            }
        });

        container.querySelectorAll('.form-field[data-validate="radio"]').forEach(function (field) {
            var radio = field.querySelector('input[type="radio"]');
            if (!radio) return;
            var name = radio.getAttribute('name');
            var checked = container.querySelector('input[name="' + name + '"]:checked');
            if (!checked) {
                isValid = false;
                setFieldError(field, 'Wybierz jedną z opcji');
            }
        });

        container.querySelectorAll('textarea[minlength]').forEach(function (textarea) {
            if (isHiddenField(textarea)) return;
            var min = parseInt(textarea.getAttribute('minlength'), 10);
            if (textarea.required && textarea.value && textarea.value.length < min) {
                isValid = false;
                setFieldError(textarea.closest('.form-field'), 'Minimalna ilość znaków to ' + min);
            }
        });

        return isValid;
    }

    function populateErrorSummary(container, summary, summaryList) {
        if (!summary || !summaryList) return;

        container.querySelectorAll('.form-field.error').forEach(function (field) {
            var label = field.querySelector('label');
            var errorMsg = field.querySelector('.error-message');
            if (label && errorMsg && errorMsg.textContent) {
                var labelText = label.textContent.replace(/\s*\*\s*$/, '').trim();
                var li = document.createElement('li');
                li.textContent = labelText + ': ' + errorMsg.textContent;
                summaryList.appendChild(li);
            }
        });

        summary.classList.add('is-visible');
    }
});
