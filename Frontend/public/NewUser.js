document.addEventListener("DOMContentLoaded", function(){
    const useremail = document.getElementById("user-username");
    const genNewUser = document.getElementById("generate-new-user");
    const userpassword = document.getElementById("user-password");

    function redirectToFirstTime() {
        const newUseremail = useremail.value; 
        const newUserPassword = userpassword.value;

        const letUserIn = {
            //check if the user email is valid, generated password matches stored password and PIN is valid

        }
    }

    useremail.addEventListener('input', redirectToFirstTime);
    userpassword.addEventListener('input', redirectToFirstTime)
    window.location.href = "SecurityQuestions.html?mode=first-time";


});