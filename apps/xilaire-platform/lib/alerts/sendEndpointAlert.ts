import nodemailer from "nodemailer"

type EndpointAlert = {
  endpointId: string
  hostname: string
  oldStatus: string
  newStatus: string
}

const transporter = nodemailer.createTransport({
  host: process.env.ALERT_SMTP_HOST!,
  port: Number(process.env.ALERT_SMTP_PORT!),
  secure: false,
  auth: {
    user: process.env.ALERT_SMTP_USER!,
    pass: process.env.ALERT_SMTP_PASS!,
  },
})

export async function sendEndpointAlert({
  endpointId,
  hostname,
  oldStatus,
  newStatus,
}: EndpointAlert) {
  const subject =
    newStatus === "online"
      ? `✅ RECOVERY: ${hostname} is back online`
      : `🚨 ALERT: ${hostname} is ${newStatus}`

  const body = `
Endpoint Status Change Detected

Hostname: ${hostname}
Endpoint ID: ${endpointId}

Previous Status: ${oldStatus}
Current Status: ${newStatus}

Time: ${new Date().toLocaleString()}

— XilAire Monitoring
`

  await transporter.sendMail({
    from: `"XilAire Monitoring" <alerts@xilairetechnologies.com>`,
    to: process.env.ALERT_RECIPIENT!,
    subject,
    text: body,
  })
}
