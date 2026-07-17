import type { EmailSenderMode, WorkspaceEmailSettings } from "@/types";
import { getPlatformFromAddress } from "@/lib/email/from-address";

const demoSettings: Omit<WorkspaceEmailSettings, "platformFromAddress" | "canEdit"> = {
  mode: "platform",
  customSenderName: null,
  customSenderEmail: null,
  senderDomain: null,
  senderDomainStatus: "not_started",
  domainSetup: {
    records: [],
    resendConfigured: true,
    domainManagementAvailable: true,
  },
};

export function getDemoWorkspaceEmailSettings(): WorkspaceEmailSettings {
  return {
    ...demoSettings,
    platformFromAddress: getPlatformFromAddress(),
    canEdit: true,
  };
}

export function updateDemoWorkspaceEmailSettings(input: {
  mode?: EmailSenderMode;
  customSenderName?: string | null;
  customSenderEmail?: string | null;
}): WorkspaceEmailSettings {
  const nextMode = input.mode ?? demoSettings.mode;
  const nextName =
    input.customSenderName !== undefined ? input.customSenderName : demoSettings.customSenderName;
  const nextEmail =
    input.customSenderEmail !== undefined ? input.customSenderEmail : demoSettings.customSenderEmail;
  const emailChanged =
    input.customSenderEmail !== undefined && input.customSenderEmail !== demoSettings.customSenderEmail;

  demoSettings.mode = nextMode;
  demoSettings.customSenderName = nextName;
  demoSettings.customSenderEmail = nextEmail;

  if (nextMode === "custom" && nextEmail) {
    if (emailChanged || demoSettings.senderDomainStatus === "not_started") {
      demoSettings.senderDomain = nextEmail.split("@")[1]?.toLowerCase() ?? null;
      demoSettings.senderDomainStatus = emailChanged ? "pending" : demoSettings.senderDomainStatus;
      if (emailChanged) {
        demoSettings.domainSetup.records = [
          {
            type: "TXT",
            name: "_dmarc",
            value: "v=DMARC1; p=none;",
            status: "pending",
            record: "DMARC",
          },
        ];
      }
    }
  } else if (nextMode !== "custom") {
    demoSettings.senderDomain = null;
    demoSettings.senderDomainStatus = "not_started";
    demoSettings.domainSetup.records = [];
  }

  return getDemoWorkspaceEmailSettings();
}

export function setupDemoWorkspaceDomain(): WorkspaceEmailSettings {
  demoSettings.senderDomainStatus = "pending";
  demoSettings.domainSetup.records = [
    {
      type: "TXT",
      name: "resend._domainkey",
      value: "demo-dkim-value",
      status: "pending",
      record: "DKIM",
    },
  ];
  return getDemoWorkspaceEmailSettings();
}

export function verifyDemoWorkspaceDomain(): WorkspaceEmailSettings {
  demoSettings.senderDomainStatus = "verified";
  demoSettings.domainSetup.records = demoSettings.domainSetup.records.map((row) => ({
    ...row,
    status: "verified",
  }));
  return getDemoWorkspaceEmailSettings();
}
