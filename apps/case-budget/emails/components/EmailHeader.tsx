import {
  Section,
} from "react-email";

import {
  EmailLogo,
} from "./EmailLogo";

type EmailHeaderProps = {
  compact?: boolean;

  centered?: boolean;
};

export function EmailHeader({
  compact = false,
  centered = false,
}: EmailHeaderProps) {
  return (
    <Section
      style={{
        padding:
          compact
            ? "24px 32px 12px"
            : "32px 40px 18px",

        textAlign:
          centered
            ? "center"
            : "left",
      }}
    >
      <EmailLogo
        size={
          compact
            ? 38
            : 44
        }
        showTagline={
          !compact
        }
        centered={
          centered
        }
      />
    </Section>
  );
}