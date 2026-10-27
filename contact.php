<?php
/* THE CLUB TOGARI — membership enquiry handler. Set CLUB_TO before going live. */
const CLUB_TO   = 'CHANGE-ME@togari.jp';         // where enquiries are delivered
const CLUB_FROM = 'no-reply@togari.jp';          // must be a sender allowed by the domain's SPF/DKIM

header_remove('X-Powered-By');

function back(string $page, int $code = 303): void {
    header('Location: ' . $page, true, $code);
    exit;
}
function field(string $key, int $max): string {
    $v = isset($_POST[$key]) ? (string) $_POST[$key] : '';
    $v = trim(str_replace(["\r", "\0"], '', $v));
    return mb_substr($v, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') back('./#contact');

// Honeypot: bots fill the hidden field; pretend success.
if (field('website', 200) !== '') back('thanks/');

$name    = field('name', 120);
$email   = field('email', 200);
$email2  = field('email_confirm', 200);
$phone   = field('phone', 40);
$address = field('address', 300);
$message = field('message', 5000);
$consent = field('consent', 5) === 'yes';

$valid = $name !== ''
    && filter_var($email, FILTER_VALIDATE_EMAIL)
    && strcasecmp($email, $email2) === 0
    && $consent
    && strpos($name, "\n") === false;

if (!$valid || strpos(CLUB_TO, 'CHANGE-ME') !== false) back('./?sent=0#contact');

$body = "New membership enquiry — THE CLUB TOGARI\n\n"
      . "Name: $name\nEmail: $email\nPhone: $phone\nAddress: $address\n\n"
      . "Message:\n$message\n\n"
      . "Consent to Privacy Policy: yes\nSent: " . gmdate('Y-m-d H:i') . " UTC\n";

$headers = [
    'From'         => 'THE CLUB TOGARI <' . CLUB_FROM . '>',
    'Reply-To'     => $email,
    'Content-Type' => 'text/plain; charset=UTF-8',
];

$ok = mail(CLUB_TO, '=?UTF-8?B?' . base64_encode('Membership enquiry: ' . $name) . '?=', $body, $headers);
back($ok ? 'thanks/' : './?sent=0#contact');
