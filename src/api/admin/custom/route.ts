import { AcmeKitRequest, AcmeKitResponse } from "@acmekit/framework/http";

export async function GET(
  req: AcmeKitRequest,
  res: AcmeKitResponse
) {
  res.sendStatus(200);
}
