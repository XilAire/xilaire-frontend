import { Client } from "@microsoft/microsoft-graph-client"
import { ClientSecretCredential } from "@azure/identity"
import {
  TokenCredentialAuthenticationProvider,
} from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials"

import "isomorphic-fetch"

/* -------------------------------------------------
   CONFIG
------------------------------------------------- */
const TENANT_ID = process.env.AZURE_TENANT_ID!
const CLIENT_ID = process.env.AZURE_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!

if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
  throw new Error("Missing Azure Graph environment variables")
}

/* -------------------------------------------------
   SINGLETON CREDENTIAL (SAFE, SERVER-ONLY)
------------------------------------------------- */
const credential = new ClientSecretCredential(
  TENANT_ID,
  CLIENT_ID,
  CLIENT_SECRET
)

/* -------------------------------------------------
   GRAPH CLIENT (SDK v3 — AUTO TOKEN REFRESH)
------------------------------------------------- */
export function getGraphClient() {
  const authProvider = new TokenCredentialAuthenticationProvider(
    credential,
    {
      scopes: ["https://graph.microsoft.com/.default"],
    }
  )

  return Client.initWithMiddleware({
    authProvider,
  })
}