import { StableBTreeMap, Server } from "azle";
import { v4 as uuidv4 } from "uuid";

// First greeting message to the user
import { systemMessage } from "./utils/ai";
import express, { Request, Response } from "express";
import cors from "cors";


type Message = {
  // System or user
  role: string;
  content: string;
  // UUID
  id: string;
};

// In turn unused
type BaseMessage = {
  role: string;
  content: string;
};

// Un used
// Add a message to conversation
type AddMessgeToConversationPayload = {
  userIdentity: string;
  conversationId: string;
  message: BaseMessage;
};

// Create a new conversation
type ConversationPayload = { userIdentity: string };

type Conversation = {
  // UUID
  id: string;
  // Array of type messages
  conversation: Message[];
};

// Un used
type ErrorMessage = { message: string };

// Stores the course of the conversation
const userConversation = StableBTreeMap<string, Conversation>(0);

export default Server(() => {
  const app = express();
  app.use(express.json());
  app.use(cors());

  // Create a new conversation -> Shouldn't this be post???
  app.put("/conversation", (req: Request, res: Response) => {

    // Requires the identity of the user
    const conversationPayload = req.body as ConversationPayload;
    if (!conversationPayload) {
      return res.status(400).json({ message: "Invalid conversation payload" });
    }

    // The first message of the conversation is the bot greeting the user
    // It contains role and content, only add the unique id
    const message = { ...systemMessage, id: uuidv4() };
    const conversation = { id: uuidv4(), conversation: [message] };
    userConversation.insert(conversationPayload.userIdentity, conversation);

    // Return the actual conversation with the id and the userID
    return res.status(200).json({
      conversation,
      // This is repetitive as the conversation itself would contain the ID
      id: conversation.id,
      initiator: conversationPayload.userIdentity,
    });
  });

  // Obtain the conversation based on the userIdentity
  app.get("/conversation/:userIdentity", (req: Request, res: Response) => {
    const userIdentity = req.params.userIdentity;
    if (!userIdentity) {
      // 404 -> not found
      return res.status(404).json({ message: "User Identity is required" });
    }

    // User identity is the key to the conversation storage
    const conversation = userConversation.get(userIdentity);
    if ("None" in conversation) {
      return res
        .status(404)
        .json({ message: `No conversation found for ${userIdentity}` });
    }

    return res.status(200).json(conversation.Some);
  });

  // Add a new message for the user
  app.post("/add/conversation", (req: Request, res: Response) => {
    const payload = req.body;
    // No check if the body consist of a user identity

    // Check if user has any conversation
    const conversation = userConversation.get(payload.userIdentity);
    if ("None" in conversation) {
      return res.status(404).json({
        message: `No conversation found for ${payload.userIdentity}`,
      });
    }

    if (
      typeof payload !== "object" ||
      Object.keys(payload).length === 0 ||
      !payload.message?.content ||
      !payload.message?.role
    ) {
      // Client error
      return res.status(400).json({ message: "Invaild payload" });
    }

    // Create new message with details provided by the user
    const newMessage = {
      role: payload.message.role,
      content: payload.message.content,
      id: uuidv4(),
    };

    // Obtain the messages array of the conversation
    const messages = conversation.Some.conversation;

    // Create new array of old messages + the new message
    const updatedMessages = [...messages, newMessage];

    // Add the message to the conversation
    const updatedConversation = {
      id: payload.conversationId,
      conversation: updatedMessages,
    };

    // Add conversation into the storage
    // Shouldn't we use somethign like update rather than just plain insert???
    userConversation.insert(payload.userIdentity, updatedConversation);
    return res.status(201).json(newMessage);
  });

  // Delete a conversation
  // Looks like anyone can delete any conversation if they know the identity of the other user
  app.delete("/conversation/:userIdentity", (req: Request, res: Response) => {
    const userIdentity = req.params.userIdentity;

    // Remove the conversation based on the user identity, if it aint present, then return error
    const removedConversation = userConversation.remove(userIdentity);

    if ("None" in removedConversation) {
      return res.status(400).json({
        message: `Can not delete conversation with for user:${userIdentity}`,
      });
    }

    return res
      .status(201)
      .send(`The conversation associated to ${userIdentity} has been deleted`);
  });

  return app.listen();
});
