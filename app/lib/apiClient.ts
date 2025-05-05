export async function fetchAccessToken() {
    try {
        const response = await fetch("/api/get-access-token", {
            method: "POST",
        });
        const token = await response.text();

        console.log("Access Token:", token); // Log the token to verify

        return token;
    } catch (error) {
        console.error("Error fetching access token:", error);
    }

    return "";
}
