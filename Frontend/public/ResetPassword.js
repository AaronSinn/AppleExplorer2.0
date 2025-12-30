document.addEventListener("DOMContentLoaded", function () {
    const passwordInput = document.getElementById("new-password");
    const confirmInput = document.getElementById("reset-new-password"); 
    const btnSubmit = document.getElementById("btnSubmitPassword");

    function validate() {
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        const checks = {
            "password-length": password.length >= 8,
            "password-uppercase": /[A-Z]/.test(password),
            "password-lowercase": /[a-z]/.test(password),
            "password-number": /[0-9]/.test(password),
            "password-special-character": /[!@#$%^&*]/.test(password),
            "password-match": password && confirm && password === confirm
        };

        let allValid = true;

        for (let key in checks) {
            const item = document.getElementById(key);
            const icon = item.querySelector("i");

            if (checks[key]) {
                icon.classList.remove("bi-x-circle", "invalid-feedback-icon");
                icon.classList.add("bi-check-circle", "valid-feedback-icon", "scale-up");
                item.classList.remove("text-muted");
                item.classList.add("text-success");
                setTimeout(() => icon.classList.remove("scale-up"), 150);
            } else {
                icon.classList.remove("bi-check-circle", "valid-feedback-icon");
                icon.classList.add("bi-x-circle", "invalid-feedback-icon");
                item.classList.remove("text-success");
                item.classList.add("text-muted");
                allValid = false;
            }
        }

        btnSubmit.disabled = !allValid;
    }

    passwordInput.addEventListener("input", validate);
    confirmInput.addEventListener("input", validate);
});
