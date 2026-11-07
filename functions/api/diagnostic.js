export async function onRequestGet({ env }) {
  const bindingPresent = Boolean(env && env.AI);
  const runAvailable = Boolean(bindingPresent && typeof env.AI.run === "function");

  return new Response(JSON.stringify({
    ok: true,
    aiBindingPresent: bindingPresent,
    aiRunAvailable: runAvailable
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
