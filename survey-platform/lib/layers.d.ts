// Tipos para window.LayersPortal (LayersPortal.js)
export interface LayersPortalInstance {
  connectedPromise: Promise<void>
  userId:           string
  communityId:      string
  accountId:        string
  session:          string
}

export interface LayersPortalWindow extends Window {
  LayersPortal?:        LayersPortalInstance
  LayersPortalOptions?: { appId: string; insidePortalOnly: boolean }
}
