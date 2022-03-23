<?php

class KResponse
{
    public $ok;
    public $headers;
    public $body;
    public $status;
    public $statusText;
    public $protocol;

    function __construct($code, $header_txt, $body)
    {
        $this->body = $body;
        $this->ok = false;
        $this->status = intval($code);

        if ($this->status >= 200 && $this->status <= 299) {
            $this->ok = true;
        }

        $this->headers = [];
        foreach (explode("\n", $header_txt) as $h) {
            $h = trim($h);
            if (empty($h)) {
                continue;
            }
            if (substr($h, 0, 4) == 'HTTP') {
                $fields = explode(' ', $h, 3);
                $this->protocol = trim($fields[0]);
                if (!empty($fields[2])) { $this->statusText = trim($fields[2]); }
                continue;
            }

            list($name, $value) = explode(':', $h, 2);
            $name = trim($name);
            $value = trim($value);
            if (isset($this->headers[$name])) {
                if (is_array($this->headers[$name])) {
                    $this->headers[$name][] = $value;
                } else {
                    $this->headers[$name] = [$this->headers, $value];
                }
            } else {
                $this->headers[$name] = $value;
            }
        }
    }

    function json()
    {
        return json_decode($this->body, true);
    }

    function text()
    {
        return $this->body;
    }
}

function kfetch($url, $options = [])
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, 1);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    if (!empty($options['tls-noverify'])) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    }

    $headers = [];
    $reqId = false;
    if (!empty($options['headers'])) {
        foreach ($options['headers'] as $k => $v) {
            $headers[] = $k . ': ' . $v;
            if (strtolower($k) === 'x-request-id') {
                $reqId = true;
            }
        }
    }
    if (!$reqId) {
        $headers[] = 'X-Request-Id: ' . uniqid();
    }

    if (!empty($options['method'])) {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($options['method']));
    }

    if (!empty($options['body'])) {
        if (is_string($options['body'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $options['body']);
        } else {
            $headers[] = 'Content-Type: application/json';
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($options['body']));
        }
    }

    /* set headers */
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $result = curl_exec($ch);
    if ($result === false) {
        return new KResponse(0, '', '');
    }
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $hsize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);


    return new KResponse($code, substr($result, 0, $hsize), substr($result, $hsize));
}