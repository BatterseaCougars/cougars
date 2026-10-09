import { describe, expect, it } from "vitest";
import { enquiryMail } from "./enquiry-mail";

const enquiry = {
  name: "Jo Bloggs",
  email: "jo@example.com",
  phone: null,
  experience: "some" as const,
  message: "Can I borrow skates?",
  source: "/join/",
};

describe("enquiryMail", () => {
  it("goes to the club, with the enquirer as Reply-To", () => {
    const mail = enquiryMail(enquiry, 7, "club@example.com");
    expect(mail).toMatchObject({
      to: ["club@example.com"],
      subject: "New enquiry: Jo Bloggs",
      replyTo: "jo@example.com",
    });
    expect(mail.text).toContain("Hockey: Skated / played a bit");
    expect(mail.text).toContain("Message:\nCan I borrow skates?");
    expect(mail.text).toContain("Enquiry #7");
  });

  it("leaves out what the enquirer didn't give", () => {
    const mail = enquiryMail({ ...enquiry, experience: null, message: null }, 8, "club@example.com");
    expect(mail.text).not.toMatch(/Phone|Hockey|Message/);
  });

  it("has a branded HTML version with the details and a button to reply", () => {
    const mail = enquiryMail({ ...enquiry, phone: "07700 900123" }, 7, "club@example.com", "They've had the reply.");
    expect(mail.html).toContain("Cougars");
    expect(mail.html).toContain("Jo Bloggs");
    expect(mail.html).toContain('href="tel:07700900123"');
    expect(mail.html).toContain('href="mailto:jo@example.com');
    expect(mail.html).toContain("Skated / played a bit");
    expect(mail.html).toContain("They&#39;ve had the reply.");
    expect(mail.html).toContain("Enquiry #7");
  });

  it("never lets what the enquirer typed become HTML", () => {
    const mail = enquiryMail(
      { ...enquiry, name: '<img src=x onerror="alert(1)">', message: "<script>bad()</script>\nline two" },
      9,
      "club@example.com",
    );
    expect(mail.html).not.toMatch(/<img|<script/);
    expect(mail.html).toContain("&lt;script&gt;bad()&lt;/script&gt;<br>line two");
  });
});
