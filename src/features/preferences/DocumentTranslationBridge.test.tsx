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

  it("lets live Vietnamese text update after switching back from English", async () => {
    const { container, rerender } = render(<div id="root"><DocumentTranslationBridge language="en" /></div>);
    await flush();
    const counter = document.createElement("span");
    counter.textContent = "Học phí";
    container.querySelector("#root")!.appendChild(counter);
    await flush();
    rerender(<div id="root"><DocumentTranslationBridge language="vi" /></div>);
    await flush();
    (counter.firstChild as Text).data = "Học phí tháng sau"; // React cap nhat chu bang cach sua node cu
    await flush();
    expect(counter.textContent).toBe("Học phí tháng sau");
  });
});
