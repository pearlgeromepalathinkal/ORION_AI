"""
Comprehensive Knowledge Base Document Generator for ORION-AI.

Populates 20 distinct, structured IT support articles across ALL 9 domain silos
and 3 knowledge sources (Confluence, SharePoint, GitHub).
"""

import os
from pathlib import Path

KB_ROOT = Path(__file__).resolve().parent.parent / "knowledge-base"

DOCUMENTS = {
    "Network": {
        "confluence": [
            ("vpn_globalprotect_sync.txt", "GlobalProtect VPN Password Sync Guide", 0.95, 0.90, 0.88,
             "To resolve GlobalProtect VPN authentication failure after an Active Directory password change:\n"
             "1. Open GlobalProtect client settings.\n2. Disconnect and refresh portal credentials.\n"
             "3. Enter your updated AD password and confirm MFA push on your phone.\n"
             "4. If connection fails, flush local DNS cache via ipconfig /flushdns (Windows) or sudo dscacheutil -flushcache (macOS)."),
            ("wifi_8021x_certificate.txt", "Enterprise Wi-Fi Certificate Renewal", 0.90, 0.92, 0.85,
             "If device disconnects from Corporate-Secure Wi-Fi:\n1. Forget 'Corporate-Secure' network in Network Settings.\n"
             "2. Reconnect and accept the updated RADIUS domain certificate.\n3. Authenticate using your domain credentials (user@company.com)."),
            ("dns_resolution_failure.txt", "Internal DNS Name Resolution Failure", 0.88, 0.85, 0.90,
             "When internal hostnames fail to resolve:\n1. Verify active VPN connection if working remotely.\n"
             "2. Confirm DNS servers are set to 10.0.0.10 and 10.0.0.11.\n3. Restart the Network Location Awareness service (Windows) or mDNSResponder (macOS)."),
            ("firewall_port_blocked.txt", "Firewall Port Request Procedure", 0.85, 0.95, 0.90,
             "To request outbound port access for development services:\n1. Submit a Network Security ticket in Jira with target IP and port range.\n"
             "2. Attach manager sign-off for ports other than 80, 443, and 22.\n3. Security team reviews rules within 24 business hours."),
            ("subnet_ip_exhaustion.txt", "DHCP Subnet IP Pool Exhaustion", 0.80, 0.88, 0.85,
             "If device receives a 169.254.x.x APIPA IP address:\n1. Disconnect Ethernet and release IP: ipconfig /release.\n"
             "2. Network operations team must expand DHCP lease pool for Vlan 104.\n3. Re-enable network adapter to obtain fresh IP lease."),
            ("cisco_switch_port_disable.txt", "Switch Port Port-Security Shutdown", 0.82, 0.90, 0.87,
             "Port error-disabled state occurs when unauthorized MAC address is detected:\n1. Contact Network Operations to clear port-security sticky MAC.\n"
             "2. Run command: shutdown followed by no shutdown on switchport Gi1/0/12.\n3. Verify device MAC address is registered in CMDB."),
            ("proxy_auth_loop.txt", "Corporate Web Proxy Authentication Loop", 0.87, 0.89, 0.86,
             "If browser repeatedly prompts for proxy credentials:\n1. Ensure Windows Internet Settings use automatic PAC script: http://wpad.corp/wpad.dat.\n"
             "2. Clear stored credentials in Windows Credential Manager under Generic Credentials.\n3. Restart browser and log in with domain credentials."),
            ("bgp_route_flap.txt", "Data Center BGP Routing Stabilization", 0.91, 0.94, 0.92,
             "During BGP route flap events affecting WAN links:\n1. Traffic automatically reroutes over secondary IPsec tunnel.\n"
             "2. Monitor route dampening metrics on core routers.\n3. Do not manually clear BGP sessions without Network Lead approval."),
            ("vlan_tagging_issue.txt", "VoIP Phone VLAN Tagging Troubleshooting", 0.83, 0.86, 0.84,
             "If IP phone displays 'No LLDP Response' or fails to get voice VLAN:\n1. Verify switch port configuration has voice vlan 200 enabled.\n"
             "2. Check switchport trunk native vlan matches data vlan 100.\n3. Power cycle phone by disconnecting PoE cable for 10 seconds."),
            ("gateway_unreachable.txt", "Default Gateway Unreachable Troubleshooting", 0.89, 0.87, 0.88,
             "If gateway ping fails on local LAN segment:\n1. Run arp -a to verify gateway MAC address resolution.\n"
             "2. Check for IP address conflict on the subnet.\n3. Restart local router or network interface card."),
            ("sdwan_edge_down.txt", "Branch Office SD-WAN Tunnel Failover", 0.93, 0.95, 0.91,
             "If primary ISP link fails at a branch office:\n1. SD-WAN appliance automatically fails over to 5G cellular backup.\n"
             "2. Bandwidth intensive applications are throttled per QoS policy.\n3. ISP ticket is automatically created via automated SNMP trap."),
            ("network_printer_discovery.txt", "Network Printer Discovery Failure", 0.81, 0.84, 0.82,
             "If network printers do not appear in print dialog:\n1. Ensure laptop is connected to Corporate Wi-Fi or VPN, not Guest Wi-Fi.\n"
             "2. Map printer directly using UNC path: \\\\printserver.corp\\PrinterName.\n3. Restart Windows Print Spooler service."),
            ("mac_address_filtering.txt", "MAC Address Bypass Registration", 0.84, 0.88, 0.85,
             "For IoT or non-802.1X devices requiring network access:\n1. Submit device MAC address to Network MAC Authentication Bypass (MAB) portal.\n"
             "2. Assign device to Restricted Vlan 300.\n3. MAB approval completes within 2 hours."),
            ("mtu_path_discovery.txt", "VPN MTU Path Discovery Packet Fragmentation", 0.86, 0.89, 0.87,
             "If web pages fail to load completely over VPN:\n1. Lower interface MTU to 1400: netsh interface ipv4 set subinterface 'Wi-Fi' mtu=1400 store=persistent.\n"
             "2. Test ICMP ping with df flag: ping 8.8.8.8 -f -l 1372.\n3. Save MTU setting and reconnect VPN."),
            ("network_bandwidth_hog.txt", "Excessive Network Bandwidth Utilization", 0.82, 0.85, 0.83,
             "If network performance degrades suddenly on a switch port:\n1. Check NetFlow telemetry for IP heavy talkers.\n"
             "2. Apply rate-limiting QoS policy on interface.\n3. Notify user if P2P or streaming traffic violates Acceptable Use Policy."),
            ("radius_server_down.txt", "RADIUS Authentication Server Failover", 0.94, 0.96, 0.93,
             "If primary RADIUS server stops responding:\n1. Network Access Control automatically fails over to Secondary RADIUS Server.\n"
             "2. Authentication requests may take up to 5 extra seconds during failover.\n3. On-call engineer receives PagerDuty alert immediately."),
            ("traceroute_latency_spike.txt", "High Network Latency Investigation", 0.85, 0.87, 0.86,
             "To diagnose network latency spikes:\n1. Perform MTR traceroute to target IP: mtr --report target.corp.\n"
             "2. Identify hop where packet loss exceeds 2%.\n3. Submit ticket to ISP if packet loss occurs outside internal WAN."),
            ("load_balancer_health.txt", "F5 Load Balancer Health Check Failure", 0.92, 0.94, 0.90,
             "If web application pool member is marked DOWN by F5:\n1. Check backend server HTTP status on port 8080.\n"
             "2. Verify health monitor URI endpoint /health returns HTTP 200 OK.\n3. Re-enable node in F5 LTM console once service recovers."),
            ("ipsec_phase2_mismatch.txt", "IPsec Site-to-Site Tunnel Phase 2 Mismatch", 0.88, 0.91, 0.89,
             "If site-to-site VPN tunnel stays DOWN:\n1. Check Phase 2 proposals match on both endpoints (AES-256, SHA-256, PFS Group 14).\n"
             "2. Ensure local and remote subnets match in crypto ACL.\n3. Bounce IPsec SA: clear crypto ipsec sa."),
            ("dot1x_supplicant_failure.txt", "Wired 802.1X Authentication Failure", 0.86, 0.88, 0.87,
             "If desktop PC fails wired 802.1X port authentication:\n1. Enable Wired AutoConfig service in Windows Services (dot3svc).\n"
             "2. In Network Adapter settings, check 'Enable IEEE 802.1X authentication'.\n3. Select Microsoft: Protected EAP (PEAP) as authentication method.")
        ],
        "sharepoint": [
            ("vpn_split_tunnel_policy.txt", "VPN Split Tunneling Traffic Policy", 0.90, 0.93, 0.89,
             "Split tunneling policy guidelines:\n1. Corporate internal subnets (10.0.0.0/8, 172.16.0.0/12) route through VPN.\n"
             "2. Public internet, Teams video, and Zoom bypass VPN directly.\n3. Do not attempt to override split-tunnel routing tables on corporate laptops."),
            ("network_security_baseline.txt", "Enterprise Network Security Baseline", 0.94, 0.96, 0.92,
             "Network security requirements:\n1. All unencrypted legacy protocols (TELNET, FTP, HTTP) are strictly blocked.\n"
             "2. Network devices must use SSHv2, SFTP, and HTTPS only.\n3. Network changes require peer review and CAB approval."),
            ("remote_access_compliance.txt", "Remote Work Network Compliance Policy", 0.91, 0.94, 0.90,
             "Compliance policy for remote connections:\n1. Devices must have active antivirus and firewall turned ON.\n"
             "2. Split-tunneling modification tools are detected and flagged.\n3. Connections from high-risk embargoed countries are automatically blocked."),
            ("guest_wifi_acceptable_use.txt", "Guest Wi-Fi Acceptable Use Policy", 0.85, 0.90, 0.88,
             "Guest Wi-Fi usage rules:\n1. Guest Wi-Fi (SSID: Company-Guest) provides internet-only access.\n"
             "2. Access expires automatically after 24 hours.\n3. Guest network traffic is monitored for security threats."),
            ("datacenter_access_policy.txt", "Data Center Physical Network Access Policy", 0.95, 0.97, 0.94,
             "Physical access rules for server rooms:\n1. Escort required for all non-badged visitors.\n"
             "2. Patch cable connections must follow color coding (Blue=Data, Red=Management, Yellow=Voice).\n3. All cable runs must be labeled on both ends."),
            ("ip_address_management.txt", "IPAM IP Address Allocation Policy", 0.89, 0.92, 0.90,
             "Static IP allocation guidelines:\n1. Static IPs must be requested via IPAM portal.\n"
             "2. Unused static IPs are reclaimed after 60 days of inactivity.\n3. Servers must use DNS names rather than hardcoded IP addresses."),
            ("bandwidth_qos_policy.txt", "Quality of Service QoS Bandwidth Allocation", 0.88, 0.91, 0.89,
             "QoS traffic prioritization rules:\n1. Voice (VoIP) and Video (Teams) assigned highest priority (EF / AF41).\n"
             "2. Business critical data assigned medium priority (AF21).\n3. General web browsing and file transfers assigned Best Effort."),
            ("dns_sec_policy.txt", "DNSSEC Domain Protection Guidelines", 0.92, 0.95, 0.91,
             "DNS security standards:\n1. All external public domain zones must have DNSSEC enabled.\n"
             "2. Zone signing keys (ZSK) rotated every 90 days.\n3. Key signing keys (KSK) rotated annually."),
            ("macsec_encryption_policy.txt", "MACsec Layer 2 Encryption Policy", 0.93, 0.96, 0.92,
             "Layer 2 encryption requirements:\n1. Inter-switch trunk links between buildings must use MACsec 256-bit encryption.\n"
             "2. Pre-shared keys rotated semi-annually.\n3. Fallback to unencrypted link is disabled."),
            ("cellular_failover_policy.txt", "Branch Office Cellular Failover Usage", 0.86, 0.89, 0.87,
             "5G cellular backup guidelines:\n1. Cellular backup intended for business-critical transactions only.\n"
             "2. Video streaming and software updates automatically blocked on backup link.\n3. Monthly data cap alerts configured at 80% threshold."),
            ("network_monitoring_policy.txt", "Network Traffic Monitoring and Logging", 0.94, 0.97, 0.93,
             "Logging and telemetry retention policy:\n1. Firewall connection logs retained for 365 days in SIEM.\n"
             "2. NetFlow / IPFIX flow data retained for 90 days.\n3. Packet captures restricted to authorized security incident responders."),
            ("wireless_ap_deployment.txt", "Wireless Access Point Installation Standard", 0.87, 0.90, 0.88,
             "AP deployment specifications:\n1. Minimum signal strength threshold: -65 dBm across all office areas.\n"
             "2. Channel width set to 20MHz on 2.4GHz and 40MHz on 5GHz.\n3. Rogue AP containment enabled globally."),
            ("ipv6_transition_roadmap.txt", "IPv6 Migration and Coexistence Policy", 0.83, 0.87, 0.85,
             "Dual-stack IPv4/IPv6 guidelines:\n1. New internal services must support IPv6 dual-stack.\n"
             "2. IPv6 prefix delegation managed via central IPAM.\n3. IPv6 router advertisements guarded via RA Guard on all access switches."),
            ("ssl_vpn_decommission.txt", "Legacy SSL VPN Client Retirement Notice", 0.91, 0.93, 0.90,
             "Retirement schedule for legacy VPN:\n1. Legacy Cisco AnyConnect client deprecated on Dec 31.\n"
             "2. All users must migrate to GlobalProtect client.\n3. Legacy VPN portals disabled permanently."),
            ("cloud_direct_connect_policy.txt", "AWS DirectConnect & Azure ExpressRoute Standard", 0.95, 0.98, 0.94,
             "Dedicated cloud link guidelines:\n1. Dual 10Gbps circuits deployed across geographically redundant data centers.\n"
             "2. BGP MD5 authentication required on all peering sessions.\n3. MACsec enabled on physical cross-connects."),
            ("wan_optimization_policy.txt", "WAN Acceleration and Optimization Settings", 0.84, 0.88, 0.86,
             "WAN optimization guidelines:\n1. CIFS/SMB file traffic optimized via Riverbed SteelHead appliances.\n"
             "2. Encrypted HTTPS traffic bypassed from optimization.\n3. Appliance health checked daily by Network Team."),
            ("network_audit_compliance.txt", "Quarterly Network Security Audit Procedure", 0.92, 0.95, 0.91,
             "Network audit process:\n1. Unused switch ports disabled automatically after 30 days of inactivity.\n"
             "2. Firewall rule base reviewed quarterly for redundant rules.\n3. Audit logs exported to compliance team."),
            ("zero_trust_network_access.txt", "ZTNA Zero Trust Network Access Architecture", 0.96, 0.98, 0.95,
             "Zero Trust access guidelines:\n1. Network location no longer grants automatic trust.\n"
             "2. Identity, device posture, and context evaluated per request.\n3. Micro-segmentation enforced at application layer."),
            ("vpn_mfa_enforcement.txt", "Mandatory Multi-Factor Authentication for Remote Access", 0.97, 0.99, 0.96,
             "MFA enforcement policy:\n1. 100% of VPN connections require MFA verification.\n"
             "2. SMS authentication phased out; push notifications or FIDO2 hardware keys required.\n3. Remember device duration limited to 12 hours."),
            ("bastion_host_network_access.txt", "Network Management Bastion Host Standard", 0.93, 0.96, 0.92,
             "Administrative access rules:\n1. Direct SSH/RDP to network infrastructure from corporate workstation is blocked.\n"
             "2. All admin sessions must originate from hardened Privileged Bastion Hosts.\n3. Session recording enabled for all administrative activities.")
        ]
    },
    "Security": {
        "sharepoint": [
            ("ad_password_policy.txt", "Active Directory Password & Lockout Policy", 0.95, 0.98, 0.93,
             "Active Directory password requirements:\n1. Passwords must be at least 16 characters long.\n"
             "2. Accounts lock out after 5 consecutive failed attempts.\n3. Self-service unlock available at https://password.company.com.\n"
             "4. Passwords sync across VPN, SSO, and email within 15 minutes."),
            ("mfa_reset_procedure.txt", "MFA Authenticator Re-registration Process", 0.92, 0.96, 0.90,
             "If user loses phone or replaces MFA device:\n1. User identity must be verified via manager video call or HR portal.\n"
             "2. Service desk generates a temporary 8-hour Passcode.\n3. User registers new device at https://aka.ms/mfasetup."),
            ("ssh_key_security_policy.txt", "Enterprise SSH Key Management Policy", 0.90, 0.94, 0.88,
             "SSH key standards:\n1. RSA keys must be 4096-bit or Ed25519.\n2. Passphrases are mandatory on all private keys.\n"
             "3. Public keys must be registered in SAML-backed SSH authority."),
            ("bitlocker_recovery_guide.txt", "BitLocker Drive Encryption Recovery", 0.94, 0.97, 0.92,
             "If laptop prompts for BitLocker recovery key at boot:\n1. User logs into https://myaccount.microsoft.com or contacts IT support.\n"
             "2. Support agent verifies employee ID and retrieves 48-digit recovery key.\n3. Enter key to unlock drive and run TPM diagnostic."),
            ("phishing_reporting_protocol.txt", "Phishing Email Incident Response Protocol", 0.88, 0.93, 0.86,
             "When suspicious email is reported via 'Report Phish' button:\n1. Email is automatically quarantined from all inbox copies.\n"
             "2. SOC analyzes embedded links and attachments.\n3. Malicious domain blocked on perimeter firewalls within 15 minutes."),
            ("oauth_app_consent_policy.txt", "OAuth Application Consent & Restrictions", 0.89, 0.92, 0.87,
             "Third-party application consent rules:\n1. User consent for enterprise data access is disabled.\n"
             "2. All OAuth apps require Admin Consent review via Security Portal.\n3. Unapproved apps blocked automatically."),
            ("pam_privileged_access.txt", "Privileged Access Management PAM Request", 0.93, 0.96, 0.91,
             "Temporary admin elevation process:\n1. Submit PAM request in CyberArk portal with valid ticket ID.\n"
             "2. Approval required from resource owner.\n3. Elevation active for maximum 4 hours with full session auditing."),
            ("tls_certificate_renewal.txt", "TLS SSL Certificate Lifecycle Standard", 0.91, 0.95, 0.90,
             "TLS certificate requirements:\n1. Maximum certificate validity period is 397 days.\n"
             "2. Automated renewal enforced via ACME protocol.\n3. Wildcard certificates restricted to non-production environments."),
            ("dlp_data_loss_prevention.txt", "Data Loss Prevention DLP Violation Handling", 0.90, 0.94, 0.89,
             "When sensitive data transfer (SSN, credit card, source code) is blocked:\n1. DLP agent generates notification alert to user and manager.\n"
             "2. To request business justification override, submit DLP ticket.\n3. Repeated policy violations result in HR escalation."),
            ("incident_response_playbook.txt", "Cybersecurity Incident Response Escalation", 0.96, 0.99, 0.95,
             "Critical incident severity levels:\n1. Sev-1 (Data Breach / Ransomware): Page Incident Commander immediately.\n"
             "2. Isolate affected subnets at core switch.\n3. Preserved volatile RAM state before powering off systems."),
            ("endpoint_edr_policy.txt", "CrowdStrike EDR Agent Enforcement", 0.95, 0.98, 0.94,
             "Endpoint protection requirements:\n1. EDR sensor mandatory on 100% of corporate endpoints.\n"
             "2. Sensor tampering or service stoppage generates immediate High alert.\n3. Isolated host can only communicate with EDR Cloud server."),
            ("security_awareness_training.txt", "Annual Mandatory Security Training Policy", 0.86, 0.90, 0.85,
             "Compliance training deadline rules:\n1. All employees must complete security refresher annually.\n"
             "2. Non-compliant accounts disabled 14 days post deadline.\n3. Manager notified at 30, 15, and 7 day intervals."),
            ("clean_desk_policy.txt", "Physical Clean Desk and Clear Screen Standard", 0.83, 0.87, 0.82,
             "Physical security guidelines:\n1. Workstations must lock automatically after 5 minutes of inactivity.\n"
             "2. Sensitive paper documents must be stored in locked pedestals.\n3. Whiteboards containing system architecture erased post meeting."),
            ("vulnerability_patching_sla.txt", "Vulnerability Remediation SLA Standard", 0.93, 0.96, 0.92,
             "Patching timelines by severity:\n1. Critical (CVSS 9.0+): Patch within 72 hours.\n"
             "2. High (CVSS 7.0-8.9): Patch within 14 days.\n3. Medium / Low: Patch within 30-60 days."),
            ("third_party_vendor_risk.txt", "Third-Party Vendor Security Assessment", 0.89, 0.92, 0.88,
             "Vendor onboarding security requirements:\n1. Vendors handling confidential data must provide SOC 2 Type II report.\n"
             "2. Annual penetration test summary report required.\n3. Vendor access granted via dedicated SAML SSO integration."),
            ("usb_storage_restriction.txt", "Removable Media USB Storage Control", 0.91, 0.94, 0.89,
             "USB storage device controls:\n1. Mass storage USB drives blocked by default via Group Policy / MDM.\n"
             "2. Read-only exception available for encrypted corporate USB drives.\n3. Write access requires CISO approval."),
            ("zero_day_vulnerability_response.txt", "Emergency Zero-Day Vulnerability Mitigation", 0.96, 0.99, 0.95,
             "Emergency response for active zero-day exploits:\n1. Security Operations team deploys virtual patching rules on WAF.\n"
             "2. Temporary workarounds applied globally within 4 hours.\n3. Executive leadership briefed daily until official vendor patch is deployed."),
            ("data_classification_policy.txt", "Enterprise Data Classification Framework", 0.90, 0.93, 0.88,
             "Data classification levels:\n1. Public: Information approved for public distribution.\n"
             "2. Internal: Standard business data.\n3. Confidential: Sensitive financial, customer, or IP data requiring encryption.\n"
             "4. Restricted: Highly sensitive keys, credentials, and PII."),
            ("security_telemetry_logging.txt", "Centralized Security Log Collection Standard", 0.92, 0.95, 0.91,
             "SIEM log collection guidelines:\n1. Domain controllers, firewalls, and cloud audit logs forwarded to Splunk in real time.\n"
             "2. Log tampering detection alerts configured.\n3. Storage encrypted with AES-256 at rest."),
            ("cloud_security_posture_cspm.txt", "Cloud Security Posture Management CSPM Guidelines", 0.94, 0.97, 0.93,
             "Automated cloud compliance monitoring:\n1. CSPM tool scans AWS/Azure accounts continuously for misconfigurations.\n"
             "2. Public S3 buckets or open Security Groups (0.0.0.0/0) auto-remediated within 5 minutes.\n3. Security score maintained above 90% across all subscriptions.")
        ]
    },
    "Software": {
        "github": [
            ("vscode_permission_denied.txt", "VS Code Installation Permission Fix", 0.90, 0.88, 0.85,
             "If installing VS Code extensions or updates fails with Permission Denied:\n1. Use User Installer instead of System Installer.\n"
             "2. Install to %LocalAppData%\\Programs\\Microsoft VS Code.\n3. If extension folder permission error occurs, run: chown -R $USER ~/.vscode."),
            ("docker_daemon_not_running.txt", "Docker Desktop Startup Failure", 0.92, 0.90, 0.88,
             "If Docker CLI displays 'Cannot connect to Docker daemon':\n1. Open Docker Desktop application and wait for Engine Running.\n"
             "2. On macOS, ensure socket link exists: sudo ln -s ~/.docker/run/docker.sock /var/run/docker.sock.\n3. On Windows, ensure WSL 2 backend is enabled."),
            ("git_merge_conflict_resolution.txt", "Git Merge Conflict Best Practices", 0.88, 0.85, 0.87,
             "Resolving git merge conflicts:\n1. Run git status to locate conflicted files.\n"
             "2. Open files in VS Code conflict editor and choose Accept Current / Incoming change.\n3. Stage resolved files: git add <file> and commit."),
            ("npm_eacces_permission_error.txt", "Node npm Global Install EACCES Error", 0.85, 0.87, 0.84,
             "Fixing npm install -g permission denied errors:\n1. Do NOT use sudo npm install -g.\n"
             "2. Reconfigure npm default directory: mkdir ~/.npm-global && npm config set prefix '~/.npm-global'\n3. Add export PATH=~/.npm-global/bin:$PATH to ~/.zshrc."),
            ("zoom_mic_muted_privacy.txt", "Zoom Microphone Access Permission", 0.83, 0.86, 0.82,
             "If Zoom microphone or camera does not work:\n1. System Preferences -> Security & Privacy -> Privacy.\n"
             "2. Select Microphone and ensure Zoom is checked.\n3. Restart Zoom application."),
            ("teams_notification_delay.txt", "Microsoft Teams Cache Clear Guide", 0.86, 0.88, 0.85,
             "If Teams is sluggish or notifications are delayed:\n1. Quit Microsoft Teams completely.\n"
             "2. Delete cache folder: rm -rf ~/Library/Application\\ Support/Microsoft/Teams\n3. Restart Teams and log in."),
            ("excel_macro_blocked.txt", "Excel Unblock Untrusted VBA Macro Guide", 0.87, 0.89, 0.86,
             "If Excel blocks macros from untrusted locations:\n1. Close Excel file.\n"
             "2. Right-click file -> Properties.\n3. Check 'Unblock' checkbox at bottom of General tab and click Apply."),
            ("chrome_extension_blocked.txt", "Chrome Enterprise Extension Request", 0.84, 0.86, 0.83,
             "If Chrome displays 'Extension blocked by administrator':\n1. Developer extensions must be approved by Software Governance Team.\n"
             "2. Submit Chrome Web Store extension URL via Jira Software request.\n3. Approved extensions pushed via Chrome Management Console within 4 hours."),
            ("python_venv_activation_error.txt", "Python virtualenv Execution Policy Fix", 0.85, 0.87, 0.84,
             "If PowerShell blocks virtualenv activation script:\n1. Open PowerShell as Administrator.\n"
             "2. Run command: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser.\n3. Re-run: .\\venv\\Scripts\\Activate.ps1."),
            ("postman_ssl_certificate_verification.txt", "Postman Self-Signed Certificate Setup", 0.82, 0.85, 0.83,
             "If Postman API requests fail with 'SSL Error: Self signed certificate':\n1. Open Postman Settings -> General.\n"
             "2. Toggle 'SSL certificate verification' to OFF for local dev environments.\n3. Import custom CA certificate under Certificates tab for staging."),
            ("slack_desktop_crash.txt", "Slack Desktop App Hardware Acceleration Fix", 0.84, 0.86, 0.83,
             "If Slack desktop client crashes or displays blank white window:\n1. Open Slack -> Help -> Troubleshooting -> Clear Cache and Restart.\n"
             "2. Disable Hardware Acceleration in Slack preferences if screen flickers.\n3. Alternatively use Slack web app."),
            ("intellij_out_of_memory.txt", "IntelliJ IDEA Heap Memory Allocation", 0.89, 0.91, 0.88,
             "If IntelliJ runs slowly or throws java.lang.OutOfMemoryError:\n1. Help -> Edit Custom VM Options.\n"
             "2. Increase maximum heap size: -Xmx4096m.\n3. Restart IntelliJ IDEA."),
            ("java_version_switch_tool.txt", "Managing Multiple Java JDK Versions", 0.87, 0.89, 0.86,
             "Switching default JDK version on developer workstations:\n1. Use SDKMAN! version manager: sdk use java 17.0.8-tem.\n"
             "2. Set JAVA_HOME environment variable to target JDK directory.\n3. Verify java -version."),
            ("pycharm_interpreter_configuration.txt", "PyCharm Virtual Environment Configuration", 0.86, 0.88, 0.85,
             "If PyCharm fails to recognize installed packages:\n1. Preferences -> Project -> Python Interpreter.\n"
             "2. Click gear icon -> Add -> Existing Environment.\n3. Select bin/python executable inside your virtualenv folder."),
            ("git_ssh_key_passphrase.txt", "Git SSH Key Agent Passphrase Persistence", 0.88, 0.90, 0.87,
             "To avoid entering SSH key passphrase on every git push:\n1. Start ssh-agent: eval \"$(ssh-agent -s)\".\n"
             "2. Add key to agent: ssh-add --apple-use-keychain ~/.ssh/id_ed25519.\n3. Add Host * UseKeychain yes config to ~/.ssh/config."),
            ("webstorm_node_memory_limit.txt", "Node.js Reached Heap Limit Fix", 0.85, 0.87, 0.84,
             "If build script fails with FATAL ERROR: Reached heap limit Allocation failed:\n1. Set Node memory environment variable: export NODE_OPTIONS=\"--max-old-space-size=4096\".\n"
             "2. Re-run npm run build."),
            ("dbeaver_database_driver_download.txt", "DBeaver JDBC Driver Download Error", 0.83, 0.86, 0.83,
             "If DBeaver fails to download PostgreSQL / MySQL JDBC driver behind corporate proxy:\n1. Preferences -> Connections -> Driver Manager.\n"
             "2. Set Network Proxy settings to HTTP Proxy: http://proxy.corp:8080.\n3. Or manually import downloaded .jar file under Driver Properties."),
            ("outlook_ost_corruption_fix.txt", "Outlook OST Data File Repair Procedure", 0.89, 0.92, 0.88,
             "If Microsoft Outlook fails to sync email or crashes at startup:\n1. Close Outlook.\n"
             "2. Navigate to %LocalAppData%\\Microsoft\\Outlook.\n3. Rename corrupted .ost file to .ost.old.\n4. Restart Outlook to rebuild clean mailbox cache."),
            ("sublime_text_license_registration.txt", "Sublime Text Enterprise License Key", 0.81, 0.84, 0.82,
             "Registering Sublime Text developer license:\n1. Help -> Enter License.\n"
             "2. Paste corporate license key block from Software Portal.\n3. License automatically saves to Local AppData."),
            ("sourcetree_git_lfs_error.txt", "SourceTree Git LFS Storage Error", 0.84, 0.87, 0.84,
             "If SourceTree fails to pull large binary files:\n1. Tools -> Options -> Git -> Enable Git LFS.\n"
             "2. Run terminal command: git lfs install.\n3. Run git lfs pull.")
        ]
    },
    "Cloud": {
        "confluence": [
            ("aws_iam_access_denied.txt", "AWS IAM Access Denied Troubleshooting", 0.94, 0.96, 0.92,
             "Resolving AWS IAM Access Denied errors:\n1. Check IAM user/role policies attached in AWS Console.\n"
             "2. Verify Service Control Policies (SCP) are not blocking action at AWS Org level.\n3. Run AWS Policy Simulator to test permissions."),
            ("aws_s3_bucket_policy.txt", "S3 Bucket Public Access Block Settings", 0.92, 0.95, 0.91,
             "Securing Amazon S3 buckets:\n1. Enable 'Block Public Access' on all corporate S3 buckets.\n"
             "2. Enforce AES-256 SSE-S3 or KMS encryption at rest.\n3. Enable Versioning and Object Lock for compliance data."),
            ("azure_vm_startup_failure.txt", "Azure Virtual Machine Allocation Failure", 0.89, 0.92, 0.88,
             "If Azure VM fails to start with AllocationFailed error:\n1. Deallocate VM completely in Azure Portal.\n"
             "2. Wait 2 minutes and retry startup to trigger re-allocation to fresh compute cluster.\n3. Change VM size if regional capacity is constrained."),
            ("kubernetes_pod_crashloop.txt", "Kubernetes Pod CrashLoopBackOff Resolution", 0.95, 0.97, 0.93,
             "Debugging Kubernetes Pod CrashLoopBackOff:\n1. Inspect pod logs: kubectl logs <pod-name> --previous.\n"
             "2. Check events: kubectl describe pod <pod-name>.\n3. Verify memory requests and limits in deployment YAML manifest."),
            ("cloudflare_dns_propagation.txt", "Cloudflare Edge DNS Propagation Time", 0.87, 0.90, 0.86,
             "Managing Cloudflare DNS updates:\n1. Cloudflare DNS updates propagate globally in under 30 seconds.\n"
             "2. If old IP persists, purge Cloudflare edge cache or test with dig @1.1.1.1 domain.com.\n3. Verify Proxy status (orange cloud) settings.")
        ]
    },
    "Database": {
        "confluence": [
            ("postgresql_connection_exhaustion.txt", "PostgreSQL Connection Pool Tuning", 0.93, 0.96, 0.91,
             "If PostgreSQL returns 'FATAL: sorry, too many clients already':\n1. Deploy PgBouncer connection pooler in transaction mode.\n"
             "2. Increase max_connections in postgresql.conf cautiously.\n3. Audit application for unclosed DB connections."),
            ("mysql_deadlock_investigation.txt", "MySQL InnoDB Deadlock Analysis", 0.91, 0.94, 0.89,
             "Diagnosing MySQL deadlocks:\n1. Run query: SHOW ENGINE INNODB STATUS.\n"
             "2. Review LATEST DETECTED DEADLOCK transaction section.\n3. Ensure application updates tables in consistent primary key order."),
            ("mongodb_replica_set_failover.txt", "MongoDB Replica Set Election Failover", 0.94, 0.97, 0.93,
             "Handling MongoDB primary node failover:\n1. Secondary node automatically elected primary within 10 seconds.\n"
             "2. Ensure connection string specifies replicaSet parameter: mongodb://node1,node2/?replicaSet=rs0.\n3. Verify write concern is set to w:majority."),
            ("redis_memory_maxlimit.txt", "Redis Memory Eviction Policy Configuration", 0.90, 0.93, 0.88,
             "If Redis returns 'OOM command not allowed when used memory > maxmemory':\n1. Set maxmemory-policy to volatile-lru or allkeys-lru in redis.conf.\n"
             "2. Audit key TTL expiration times.\n3. Cluster or upscale Redis memory size.")
        ]
    },
    "Server": {
        "confluence": [
            ("linux_disk_space_full.txt", "Linux Root Filesystem Disk Space Cleanup", 0.95, 0.98, 0.93,
             "If Linux server filesystem reaches 100% disk usage:\n1. Identify large files: du -ah / | sort -rh | head -n 20.\n"
             "2. Safely truncate log files: > /var/log/nginx/access.log.\n3. Remove old journal logs: journalctl --vacuum-time=3d.\n4. Clean package cache: apt-get clean or yum clean all."),
            ("nginx_502_bad_gateway.txt", "Nginx 502 Bad Gateway Resolution", 0.92, 0.95, 0.90,
             "Debugging Nginx 502 Bad Gateway errors:\n1. Check backend service status: systemctl status gunicorn / php-fpm / node.\n"
             "2. Inspect error log: tail -f /var/log/nginx/error.log.\n3. Verify backend socket or port 127.0.0.1:8080 is listening."),
            ("systemd_service_crash.txt", "Systemd Service Auto-Restart Configuration", 0.89, 0.92, 0.88,
             "Configuring resilient Linux services in systemd:\n1. Edit service file: /etc/systemd/system/myservice.service.\n"
             "2. Add under [Service]: Restart=always and RestartSec=5s.\n3. Reload daemon: systemctl daemon-reload && systemctl restart myservice.")
        ]
    },
    "Hardware": {
        "sharepoint": [
            ("laptop_thermal_throttling.txt", "Laptop CPU Thermal Throttling Fix", 0.88, 0.91, 0.86,
             "If corporate laptop fan is loud and performance drops:\n1. Check CPU usage in Task Manager / Activity Monitor for runaway processes.\n"
             "2. Clear dust from cooling vents.\n3. Ensure laptop is used on hard flat surface, not soft bedding.\n4. Run Dell / Apple Hardware Diagnostics."),
            ("usbc_docking_display_issue.txt", "USB-C Docking Station External Monitor Drop", 0.87, 0.90, 0.85,
             "If external monitors disconnect intermittently via USB-C dock:\n1. Unplug USB-C power delivery cable for 15 seconds to reset dock firmware.\n"
             "2. Update DisplayLink / Thunderbolt dock drivers.\n3. Ensure laptop charger is plugged directly into dock power port.")
        ]
    },
    "EU-IT": {
        "sharepoint": [
            ("gdpr_data_export_request.txt", "GDPR Subject Access Request Procedure", 0.96, 0.99, 0.94,
             "Processing EU GDPR Data Subject Access Requests (DSAR):\n1. Submit request to Data Protection Officer (DPO) portal.\n"
             "2. Automated script aggregates user data across Salesforce, Jira, and Active Directory.\n3. Data exported in encrypted ZIP within 30 days."),
            ("works_council_software_approval.txt", "EU Works Council Software Onboarding Compliance", 0.93, 0.96, 0.91,
             "Deploying new software tools in EU offices:\n1. Software tracking employee metrics requires Works Council (Betriebsrat) sign-off.\n"
             "2. Privacy Impact Assessment (PIA) must be filed.\n3. Keylogging or webcam monitoring features must be disabled globally.")
        ]
    },
    "US-IT": {
        "sharepoint": [
            ("hipaa_compliance_logging.txt", "US Healthcare HIPAA Data Access Audit Standard", 0.97, 0.99, 0.95,
             "Enforcing HIPAA security compliance:\n1. All systems storing Protected Health Information (PHI) must encrypt data at rest (AES-256).\n"
             "2. User access logs retained for minimum 6 years.\n3. Inactive sessions lock automatically after 15 minutes.")
        ]
    }
}


def clean_and_rebuild_kb():
    """
    Cleans up old duplicate folder variations and rebuilds clean structured files.
    """
    created_count = 0
    
    for domain, sources in DOCUMENTS.items():
        for source_type, file_list in sources.items():
            dir_path = KB_ROOT / domain / source_type
            dir_path.mkdir(parents=True, exist_ok=True)
            
            for filename, title, freshness, authority, reliability, content in file_list:
                file_path = dir_path / filename
                file_content = (
                    f"Title: {title}\n"
                    f"Source: {source_type.title()}\n"
                    f"Domain: {domain}\n"
                    f"Freshness: {freshness}\n"
                    f"Authority: {authority}\n"
                    f"Reliability: {reliability}\n"
                    f"Content:\n{content.strip()}\n"
                )
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(file_content)
                created_count += 1

    print(f"Successfully generated {created_count} structured documents across all 9 domain silos!")


if __name__ == "__main__":
    clean_and_rebuild_kb()
