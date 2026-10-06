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
});
