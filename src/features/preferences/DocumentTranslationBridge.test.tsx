// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentTranslationBridge } from "@/features/preferences/DocumentTranslationBridge";

afterEach(cleanup);
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });

describe("DocumentTranslationBridge", () => {
  it("translates interface text but leaves user content marked translate=no", async () => {
    const { container } = render(<div><p>Tổng quan</p><p translate="no">Tổng quan</p><DocumentTranslationBridge language="en" /></div>);
    await flush();
    const [ui, data] = container.querySelectorAll("p");
    expect(ui.textContent).toBe("Overview");
    expect(data.textContent).toBe("Tổng quan");
  });

  it("translates nodes added later and restores Vietnamese when switching back", async () => {
    const { container, rerender } = render(<div id="root"><DocumentTranslationBridge language="en" /></div>);
    await flush();
    const added = document.createElement("span");
    added.textContent = "Học phí";
    container.querySelector("#root")!.appendChild(added);
    await flush();
    expect(added.textContent).toBe("Tuition");
    rerender(<div id="root"><DocumentTranslationBridge language="vi" /></div>);
    await flush();
    expect(added.textContent).toBe("Học phí");
  });
});
