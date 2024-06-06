import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { addMessageToConversation } from "../utils/chat";
import { decryptData } from "../utils/encryptData";

const useApi = () => {
  // Variables
  const [data, setData] = useState("");

  // Array of messages
  const [chatMessage, setChatMessage] = useState([]);

  const [error, setError] = useState();
  const [loading, setLoading] = useState(false);

  // SetUploading is not utilized
  const [uploading, setUploading] = useState(false);
  const OPEN_AI_API_KEY = () =>
    decryptData(localStorage.getItem("icp-dai-open-ai"));

  // Main function

  const chatCompletion = useCallback(async (payload) => {
    // Open AI url
    const url = "https://api.openai.com/v1/chat/completions";

    // Start loading
    setLoading(true);
    try {
      // Function from util chat
      await addMessageToConversation(payload.at(-1));

      // Fetch API request
      const response = await fetch(url, {
        // Post request
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + OPEN_AI_API_KEY()?.split('"')[1],
        },
        // Add the message content and role from the input
        body: JSON.stringify({
          messages: payload.map((message) => ({
            content: message.content,
            role: message.role,
          })),
          model: "gpt-3.5-turbo",
          temperature: 1,
        }),
      });

      // Wait for the response to resolve
      const result = await response.json();

      // Send error message
      if (response.status !== 200) {
        const message = result.error.message;
        // I think the loading must be set to false here
        toast.error(message);
        throw new Error(message);
      }

      const assistantContent = result.choices[0].message.content;
      const messageToSaveFromAssistant = {
        content: assistantContent,
        role: "assistant",
      };

      // Update the chat message state variable to include the new message into the array
      setChatMessage((prev) => [...prev, messageToSaveFromAssistant]);
      await addMessageToConversation(messageToSaveFromAssistant);

      // Content of the return data from the server
      setData(assistantContent);
      setError(null);

      // Turn off loading
      setLoading(false);
    } catch (error) {
        setLoading(false);
        setError(error);
    }
  }, []);

  // Return all the important state variables
  return {
    data,
    error,
    loading,
    chatCompletion,
    // Uploading only referenced here
    uploading,
    setData,
    chatMessage,
    setChatMessage,
  };
};

export default useApi;
