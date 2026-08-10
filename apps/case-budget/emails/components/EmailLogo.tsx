import {
  Link,
  Text,
} from "react-email";

import {
  caseBudgetEmailTheme,
} from "../styles/theme";

type EmailLogoProps = {
  size?: number;

  showTagline?: boolean;

  centered?: boolean;
};

export function EmailLogo({
  size = 44,
  showTagline = true,
  centered = false,
}: EmailLogoProps) {
  return (
    <div
      style={{
        textAlign:
          centered
            ? "center"
            : "left",
      }}
    >
      <Link
        href={
          caseBudgetEmailTheme
            .brand
            .websiteUrl
        }
        style={{
          display:
            "inline-block",

          textDecoration:
            "none",
        }}
      >
        <div
          style={{
            display:
              "inline-table",

            verticalAlign:
              "middle",
          }}
        >
          <div
            style={{
              display:
                "table-cell",

              verticalAlign:
                "middle",

              width:
                `${size}px`,

              height:
                `${size}px`,

              borderRadius:
                `${Math.round(
                  size * 0.3,
                )}px`,

              backgroundColor:
                caseBudgetEmailTheme
                  .colors
                  .primary,

              textAlign:
                "center",
            }}
          >
            <Text
              style={{
                margin:
                  0,

                color:
                  caseBudgetEmailTheme
                    .colors
                    .white,

                fontFamily:
                  caseBudgetEmailTheme
                    .typography
                    .headingFontFamily,

                fontSize:
                  `${Math.round(
                    size * 0.36,
                  )}px`,

                fontWeight:
                  800,

                lineHeight:
                  `${size}px`,
              }}
            >
              CB
            </Text>
          </div>

          <div
            style={{
              display:
                "table-cell",

              verticalAlign:
                "middle",

              paddingLeft:
                "12px",
            }}
          >
            <Text
              style={{
                margin:
                  0,

                color:
                  caseBudgetEmailTheme
                    .colors
                    .text,

                fontFamily:
                  caseBudgetEmailTheme
                    .typography
                    .headingFontFamily,

                fontSize:
                  "18px",

                fontWeight:
                  800,

                lineHeight:
                  "22px",
              }}
            >
              {
                caseBudgetEmailTheme
                  .brand
                  .name
              }
            </Text>

            {showTagline ? (
              <Text
                style={{
                  margin:
                    "3px 0 0",

                  color:
                    caseBudgetEmailTheme
                      .colors
                      .textMuted,

                  fontFamily:
                    caseBudgetEmailTheme
                      .typography
                      .fontFamily,

                  fontSize:
                    "10px",

                  fontWeight:
                    700,

                  letterSpacing:
                    "1.4px",

                  lineHeight:
                    "14px",

                  textTransform:
                    "uppercase",
                }}
              >
                {
                  caseBudgetEmailTheme
                    .brand
                    .companyName
                }
              </Text>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}